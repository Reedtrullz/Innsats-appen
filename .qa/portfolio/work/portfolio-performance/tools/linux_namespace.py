# Linux loopback browser namespace. Pure tests do not prove the kernel guards.
from __future__ import annotations

import argparse
import json
import os
import platform
import selectors
import shutil
import subprocess
import sys
import time
import uuid
from pathlib import Path

from protocol import Rejected, file_hash, record, require
from resource_limits import regular_path

PROFILE = 'linux-loopback-browser-v1'
ADMISSION_SCHEMA = 'linux-loopback-browser-admission/v1'
MIN_SCRATCH = 8 * 1024 * 1024  # shortcut: 8MiB is the smallest reservation the over-limit control can fill under the 64MiB case; raise it if Linux qualification shows Chromium needs more
CASE_CEILING = 64 * 1024 * 1024
MIB = 1024 * 1024
STREAM_CAP = MIB
CLEANUP_OK = {'mountsRemoved': True, 'survivors': 0, 'unacknowledged': False}
REQUIRED_CONTROLS = (
    'positive: loopback and preinstalled browser tool',
    'negative: foreign egress denied',
    'negative: private canary and checkout .git unreadable',
    'negative: outside writes denied',
    'negative: privileges cannot be regained',
    'negative: tmpfs write beyond reservation stopped',
    'negative: timeout kills the command',
    'negative: output flood terminated',
    'negative: detached child does not survive',
)
ROLES = ('source', 'harness', 'chromium')
FLOOD_EXITS = {-15, -9, -13, 143, 137, 141, 120}
# shortcut: mountinfo field 5 splits on spaces, same as the qualified Bunker admission; use a NUL reader if a host mount path contains a space.
SCRIPT = r"""set -eu
scratch=$1
uid=$2
gid=$3
size=$4
home=$5
limit=$6
nroots=$7
shift 7
case "$nroots" in 3|4) ;; *) exit 97;; esac
mount --make-rprivate /
mkdir -p -- "$scratch"
mount -t tmpfs -o "size=$size,mode=0700,uid=$uid,gid=$gid,nosuid,nodev" tmpfs "$scratch"
i=0
while [ "$i" -lt "$nroots" ]; do
  install -d -- "$scratch/.stage/$i"
  mount --bind "$1" "$scratch/.stage/$i"
  printf '%s\n' "$1" > "$scratch/.stage/name-$i"
  shift
  i=$((i+1))
done
if [ -d "$home" ]; then mount -t tmpfs -o size=64k,mode=0755,nosuid,nodev tmpfs "$home"; fi
i=0
while [ "$i" -lt "$nroots" ]; do
  root=$(cat "$scratch/.stage/name-$i")
  mkdir -p -- "$root"
  mount --bind "$scratch/.stage/$i" "$root"
  if [ -d "$root/.git" ]; then mount -t tmpfs -o size=4k,mode=0555,ro tmpfs "$root/.git"
  elif [ -e "$root/.git" ]; then mount --bind /dev/null "$root/.git"; fi
  umount -l "$scratch/.stage/$i"
  i=$((i+1))
done
while read -r mp; do
  case "$mp" in
    "$scratch"|"$scratch"/*|/proc|/proc/*|/sys|/sys/*|/dev/pts) continue;;
  esac
  mount -o remount,bind,ro "$mp" 2>/dev/null || { printf 'namespace-diag remount-failed %.200s\n' "$mp" >&2; exit 97; }
done <<EOF
$(awk '{print $5}' /proc/self/mountinfo)
EOF
install -d -o "$uid" -g "$gid" -m 0700 "$scratch/home" "$scratch/tmp" "$scratch/shm" "$scratch/cache" "$scratch/config" "$scratch/run" "$scratch/work"
mount --bind "$scratch/tmp" /tmp
if [ -d /var/tmp ]; then mount --bind "$scratch/tmp" /var/tmp; fi
if [ -d /dev/shm ]; then mount --bind "$scratch/shm" /dev/shm; fi
ip link set lo up
exec timeout --signal=KILL "$limit" setpriv --reuid="$uid" --regid="$gid" --clear-groups --no-new-privs --inh-caps=-all --bounding-set=-all "$@"
"""
BROWSER = r"""import hashlib, json, os, socket, subprocess, sys
path = sys.argv[1]
digest = hashlib.sha256(open(path, 'rb').read()).hexdigest()
proc = subprocess.run([path, '--version'], capture_output=True, text=True, timeout=20)
srv = socket.socket(); srv.bind(('127.0.0.1', 0)); srv.listen(1)
socket.create_connection(srv.getsockname(), timeout=3).close(); srv.close()
print(json.dumps({'sha256': digest, 'access': os.access(path, os.X_OK), 'version_code': proc.returncode, 'loopback': 'OK'}))
"""
EGRESS = r"""import json, socket
out = {}
for host, port in (('192.0.2.1', 80), ('1.1.1.1', 443)):
    handle = socket.socket(); handle.settimeout(3)
    try:
        handle.connect((host, port)); out[host] = 'CONNECTED'
    except OSError as error:
        out[host] = type(error).__name__
    finally:
        handle.close()
print(json.dumps(out))
"""
PRIVATE = r"""import errno, json, os, sys
canary, root, host_home = sys.argv[1:4]
def code(error):
    return errno.errorcode.get(error.errno, str(error.errno))
def read(path):
    try:
        with open(path, 'rb') as handle:
            handle.read(1)
        return 'READ'
    except OSError as error:
        return code(error)
print(json.dumps({'home_canary': read(canary), 'git_head': read(os.path.join(root, '.git', 'HEAD'))}))
"""
WRITES = r"""import json, os, sys
out = {}
for label, base in (('checkout', sys.argv[1]), ('home', sys.argv[2]), ('scratch', os.environ['TMPDIR'])):
    path = os.path.join(base, 'namespace-write-probe')
    try:
        open(path, 'w').close(); os.unlink(path); out[label] = 'WRITABLE'
    except OSError as error:
        out[label] = error.errno
print(json.dumps(out))
"""
PRIVS = r"""import errno, json, os, subprocess
status = dict(line.split(':', 1) for line in open('/proc/self/status') if ':' in line)
def attempt(argv):
    try:
        return 'OK' if subprocess.run(argv, capture_output=True, timeout=10).returncode == 0 else 'DENIED'
    except (OSError, subprocess.SubprocessError):
        return 'DENIED'
try:
    os.setuid(0); setuid0 = 'OK'
except OSError as error:
    setuid0 = errno.errorcode.get(error.errno, str(error.errno))
caps = {key: status[key].strip() for key in ('CapInh', 'CapPrm', 'CapEff', 'CapBnd', 'CapAmb')}
print(json.dumps({'nnp': int(status['NoNewPrivs']), 'caps': caps, 'sudo': attempt(['sudo', '-n', 'true']), 'setuid0': setuid0, 'mount': attempt(['mount', '-t', 'tmpfs', 'x', '/mnt'])}))
"""
OVERLIMIT = r"""import json, os
chunk = b'x' * (1 << 20)
count = 0
paths = [os.path.join(directory, 'fill') for directory in (os.environ['TMPDIR'], '/tmp', '/dev/shm')]
try:
    while count < 200:
        with open(paths[count % 3], 'ab') as handle:
            handle.write(chunk); handle.flush(); os.fsync(handle.fileno())
        count += 1
    print(json.dumps({'errno': None, 'mib': count}))
except OSError as error:
    print(json.dumps({'errno': error.errno, 'mib': count}))
finally:
    for path in paths:
        try:
            os.unlink(path)
        except OSError:
            pass
"""
SURVIVOR = "import json, os, subprocess, sys; p=subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(300)', os.environ['HOME']], start_new_session=True); print(json.dumps({'detached_started': p.pid > 0}))"
SLEEP = 'import time; time.sleep(60)'
FLOOD = "import sys\nwhile True: sys.stdout.write('x' * 65536)"


def relative_safe(value: object) -> bool:
    if not isinstance(value, str) or value in ('', '.') or '\\' in value:
        return False
    path = Path(value)
    return value == path.as_posix() and not path.is_absolute() and '..' not in path.parts


def link_target(value: object) -> bool:
    """Path keys stay strict. A link target may use '..' when it still resolves inside its root."""
    if not isinstance(value, str) or value == '' or '\\' in value or '\x00' in value:
        return False
    return not Path(value).is_absolute()


def covered(path: Path, roots: list[Path]) -> bool:
    resolved = path.resolve()
    return any(resolved == root or resolved.is_relative_to(root) for root in roots)


def snapshot_root(root: Path) -> tuple[dict[str, str], dict[str, str]]:
    files: dict[str, str] = {}
    links: dict[str, str] = {}
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if '.git' in relative.parts:
            continue
        name = relative.as_posix()
        if path.is_symlink():
            target = os.readlink(path)
            require(link_target(target), 'namespace symlink escape')
            resolved = (path.parent / target).resolve()
            require(covered(resolved, [root.resolve()]) and '.git' not in resolved.relative_to(root.resolve()).parts, 'namespace symlink escape')
            links[name] = target
        elif path.is_file():
            files[name] = file_hash(path)
        elif path.is_dir():
            continue
        else:
            require(False, 'namespace special file')
    return files, links


def load_json(path: Path, reason: str) -> dict:
    try:
        return record(json.loads(path.read_text()))
    except (OSError, json.JSONDecodeError, Rejected) as error:
        raise Rejected(reason) from error


def check_tree(manifest: dict) -> list[Path]:
    require(set(manifest) == {'profile', 'roots'}, 'malformed namespace manifest')
    require(manifest.get('profile') == PROFILE, 'unqualified namespace profile')
    rows = manifest.get('roots')
    require(isinstance(rows, list) and len(rows) in (3, 4), 'malformed namespace manifest')
    roots: list[Path] = []
    roles: list[str] = []
    for item in rows:
        row = record(item)
        require(row.get('role') in ROLES, 'malformed namespace manifest')
        keys = {'path', 'role', 'files', 'symlinks'} | ({'executable'} if row['role'] == 'chromium' else set())
        require(set(row) == keys, 'malformed namespace manifest')
        regular_path(Path(row['path']))
        root = Path(row['path']).resolve()
        require(root.is_dir(), 'namespace root missing')
        files, links = snapshot_root(root)
        require(row['files'] == files and row['symlinks'] == links, 'stale namespace manifest')
        if row['role'] == 'chromium':
            executable = row['executable']
            require(relative_safe(executable) and executable in files, 'namespace browser tool')
            binary = root / executable
            require(binary.is_file() and not binary.is_symlink() and os.access(binary, os.X_OK), 'namespace browser tool')
        roots.append(root)
        roles.append(row['role'])
    expected = ['source', 'harness', 'chromium'] if len(rows) == 3 else ['source', 'source', 'harness', 'chromium']
    require(roles == expected, 'malformed namespace manifest')
    for left in roots:
        for right in roots:
            require(left == right or not left.is_relative_to(right), 'overlapping namespace roots')
    return roots


def controls_complete(rows: object) -> bool:
    if not isinstance(rows, list):
        return False
    names = [row.get('control') for row in rows if isinstance(row, dict)]
    if names != list(REQUIRED_CONTROLS) or len(rows) != len(REQUIRED_CONTROLS):
        return False
    return all(isinstance(row, dict) and row.get('pass') is True and row.get('cleanup') is True for row in rows)


def check_admission(receipt: dict, scratch_bytes: int, manifest_path: Path, roots: list[Path]) -> None:
    require(isinstance(receipt, dict) and receipt.get('schema') == ADMISSION_SCHEMA and receipt.get('profile') == PROFILE, 'malformed namespace admission')
    require(receipt.get('status') == 'PASS', 'namespace admission not passed')
    require(receipt.get('scratchBytes') == scratch_bytes, 'namespace scratch reservation')
    require(receipt.get('manifestSha256') == file_hash(manifest_path), 'stale namespace manifest')
    require(receipt.get('readOnlyRoots') == [str(root) for root in roots], 'namespace admission roots')
    rows = receipt.get('controls')
    if not isinstance(rows, list) or [row.get('control') for row in rows if isinstance(row, dict)] != list(REQUIRED_CONTROLS):
        require(False, 'namespace admission control set')
    require(controls_complete(rows), 'namespace control failed')
    require(receipt.get('cleanup') == CLEANUP_OK, 'namespace cleanup not confirmed')


def validate(data: dict, phase: str) -> dict:
    require('container' not in data, 'container and namespace are mutually exclusive')
    spec = record(data.get('namespace'))
    require(set(spec) == {'profile', 'scratchBytes', 'readOnlyRoots', 'manifest', 'admission'}, 'namespace fields')
    require(spec.get('profile') == PROFILE, 'unqualified namespace profile')
    require(data.get('modality') == 'browser' and data.get('resourceProfile') == 'browser-64m-20261028', 'namespace browser envelope')
    capacity = spec.get('scratchBytes')
    require(type(capacity) is int and MIN_SCRATCH <= capacity < data['scratchBytes'] <= CASE_CEILING and capacity < CASE_CEILING, 'namespace scratch reservation')
    require(12 < data['timeout'] <= 120, 'namespace control deadline')
    listed = spec.get('readOnlyRoots')
    require(isinstance(listed, list) and len(listed) in (3, 4) and all(isinstance(item, str) for item in listed) and len(set(listed)) == len(listed), 'namespace roots')
    manifest_path, admission_path = Path(spec['manifest']), Path(spec['admission'])
    regular_path(manifest_path)
    regular_path(admission_path)
    require(manifest_path.is_file() and admission_path.is_file(), 'missing namespace binding')
    allowed = {**data['harness'], **data['fixtures']}
    require(str(manifest_path) in allowed and file_hash(manifest_path) == allowed[str(manifest_path)], 'unbound namespace manifest')
    require(str(admission_path) in allowed and file_hash(admission_path) == allowed[str(admission_path)], 'unbound namespace admission')
    manifest = load_json(manifest_path, 'malformed namespace manifest')
    roots = check_tree(manifest)
    roles = [row['role'] for row in manifest['roots']]
    require(listed == [str(root) for root in roots], 'namespace roots')
    require(not covered(manifest_path, roots) and not covered(admission_path, roots), 'namespace binding inside root')
    sources = [root for root, role in zip(roots, roles) if role == 'source']
    harness = next(root for root, role in zip(roots, roles) if role == 'harness')
    checkouts = []
    for phase_name in ('baseline', 'candidate'):
        cwd = Path(data[phase_name]['cwd']).resolve()
        if cwd not in checkouts:
            checkouts.append(cwd)
        for path in data[phase_name]['sources']:
            require(covered(Path(path), [cwd]), 'namespace source escape')
    require(sources == checkouts, 'namespace source escape')
    for path in data['harness']:
        if path not in (str(manifest_path), str(admission_path)):
            require(covered(Path(path), [harness]), 'namespace source escape')
    for path in data['fixtures']:
        require(covered(Path(path), roots), 'namespace source escape')
    for phase_name in ('baseline', 'candidate'):
        for command in data['commands'].values():
            argv = command[phase_name]
            binary = Path(argv[0])
            require(binary.is_file() and not binary.is_symlink() and os.access(binary, os.X_OK) and covered(binary, [harness]), 'namespace source escape')
            for arg in argv[1:]:
                candidate = Path(arg)
                if candidate.is_absolute() and candidate.exists():
                    require(covered(candidate, roots), 'namespace source escape')
    check_admission(load_json(admission_path, 'malformed namespace admission'), capacity, manifest_path, roots)
    return spec


def preflight() -> dict:
    checks = {'linux': platform.system() == 'Linux'}
    if not checks['linux']:
        return {'checks': checks, 'ready': False}
    tool_path = os.environ.get('PATH', '') + ':/usr/sbin:/sbin'
    help_text = subprocess.run(['unshare', '--help'], capture_output=True, text=True, check=False).stdout if shutil.which('unshare', path=tool_path) else ''
    setpriv_help = subprocess.run(['setpriv', '--help'], capture_output=True, text=True, check=False).stdout if shutil.which('setpriv', path=tool_path) else ''
    sudo = bool(shutil.which('sudo', path=tool_path)) and subprocess.run(['sudo', '-n', 'true'], capture_output=True, check=False).returncode == 0
    checks.update({
        'python_3_12': sys.version_info[:2] == (3, 12),
        'not_root': os.getuid() != 0,
        'sudo_noninteractive': sudo,
        'run_directory': Path('/run').is_dir(),
        'tools': all(shutil.which(tool, path=tool_path) for tool in ('unshare', 'setpriv', 'timeout', 'ip', 'mount', 'awk', 'install')),
        'unshare_flags': all(flag in help_text for flag in ('--kill-child', '--mount-proc', '--net')),
        'setpriv_flags': all(flag in setpriv_help for flag in ('--no-new-privs', '--inh-caps', '--bounding-set')),
    })
    return {'checks': checks, 'ready': all(checks.values())}


def outer_argv(inner: list[str], mount: str, scratch_bytes: int, roots: list[str], limit: int, uid: int, gid: int, request: str | None = None) -> list[str]:
    require(len(roots) in (3, 4) and all(isinstance(arg, str) and arg and '\x00' not in arg and '\n' not in arg for arg in (*inner, *roots)), 'literal argv required')
    env = [f'PATH={Path(sys.executable).parent}:/usr/bin:/bin', f'HOME={mount}/home', f'TMPDIR={mount}/tmp',
           f'XDG_CACHE_HOME={mount}/cache', f'XDG_CONFIG_HOME={mount}/config', f'XDG_RUNTIME_DIR={mount}/run',
           'LANG=C', 'PYTHONDONTWRITEBYTECODE=1']
    if request is not None:
        require('\x00' not in request and '\n' not in request, 'measurement request')
        env.append('MEASURE_REQUEST=' + request)
    return ['sudo', '-n', 'unshare', '--net', '--mount', '--pid', '--fork', '--kill-child', '--mount-proc',
            'sh', '-c', SCRIPT, 'ns', mount, str(uid), str(gid), str(scratch_bytes), str(Path.home()), str(limit),
            str(len(roots)), *roots, 'env', '-i', *env, *inner]


def redact(output: bytes) -> str:
    return output[-500:].decode('utf-8', 'replace').replace(str(Path.home()), '<home>')


def survivors(mount: str) -> int:
    marker = mount.encode()
    count = 0
    proc = Path('/proc')
    if not proc.is_dir():
        return count
    for entry in proc.iterdir():
        if entry.name.isdigit() and int(entry.name) != os.getpid():
            try:
                if marker in (entry / 'cmdline').read_bytes():
                    count += 1
            except OSError:
                pass
    return count


def run_contained(inner: list[str], mount: str, scratch_bytes: int, roots: list[str], limit: int, cap: int = STREAM_CAP) -> dict:
    require(type(limit) is int and 0 < limit <= 108, 'namespace invocation must reserve bounded teardown inside 120 seconds')
    require(not Path(mount).exists(), 'namespace anchor already exists')
    started = time.monotonic()
    process = subprocess.Popen(outer_argv(inner, mount, scratch_bytes, roots, limit, os.getuid(), os.getgid()),
                               stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
    assert process.stdout is not None
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    buffer, overflow, late = bytearray(), False, False
    code = 1
    try:
        while True:
            if time.monotonic() - started > limit + 5:
                late = True
                break
            if not selector.select(1):
                continue
            data = os.read(process.stdout.fileno(), 65536)
            if not data:
                break
            buffer += data
            if len(buffer) > cap:
                overflow = True
                break
        if overflow or late:
            process.stdout.close()
            try:
                os.killpg(process.pid, 15)
            except ProcessLookupError:
                process.poll()
        try:
            code = process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(process.pid, 9)
            except ProcessLookupError:
                process.poll()
            code = process.wait(timeout=1)
    finally:
        selector.close()
        process.stdout.close()
        # The private mount namespace exits with its init; only the owned host directory remains.
        subprocess.run(['sudo', '-n', 'rmdir', '--', mount], capture_output=True, check=False, timeout=3)
    return {'returncode': code, 'output': bytes(buffer[:cap]), 'overflow': overflow, 'wrapper_deadline': late,
            'elapsed_s': round(time.monotonic() - started, 2), 'survivors': survivors(mount),
            'scratch_removed': not Path(mount).exists()}


def last_json(output: bytes):
    for line in reversed(output.splitlines()):
        if line.startswith(b'{'):
            try:
                return json.loads(line)
            except ValueError:
                return None
    return None


def clean(run: dict, *, exit_ok: bool) -> bool:
    return exit_ok and not run['overflow'] and not run['wrapper_deadline'] and run['survivors'] == 0 and bool(run['scratch_removed'])


def judge_browser(seen: dict, expected: str) -> bool:
    return seen.get('sha256') == expected and seen.get('access') is True and seen.get('version_code') == 0 and seen.get('loopback') == 'OK'


def judge_egress(seen: dict) -> bool:
    return seen.get('192.0.2.1') not in (None, 'CONNECTED') and seen.get('1.1.1.1') not in (None, 'CONNECTED')


def judge_private(seen: dict, host: dict) -> bool:
    denied = {'ENOENT', 'EACCES', 'EPERM', 'ENOTDIR'}
    return seen.get('home_canary') in denied and seen.get('git_head') in denied and host.get('canary_intact') is True


def judge_writes(seen: dict) -> bool:
    return seen.get('checkout') == 30 and seen.get('home') == 30 and seen.get('scratch') == 'WRITABLE'


def judge_privs(seen: dict) -> bool:
    caps = seen.get('caps') or {}
    try:
        empty = set(caps) == {'CapInh', 'CapPrm', 'CapEff', 'CapBnd', 'CapAmb'} and all(int(value, 16) == 0 for value in caps.values())
    except (TypeError, ValueError):
        return False
    return seen.get('nnp') == 1 and empty and seen.get('sudo') == 'DENIED' and seen.get('setuid0') == 'EPERM' and seen.get('mount') == 'DENIED'


def judge_overlimit(seen: dict, scratch_bytes: int) -> bool:
    return seen.get('errno') == 28 and isinstance(seen.get('mib'), int) and 0 < seen['mib'] <= scratch_bytes // MIB


def admission_document(status: str, scratch_bytes: int, manifest_path: Path, roots: list[str], rows: list, cleanup: dict, gate: dict) -> dict:
    return {'schema': ADMISSION_SCHEMA, 'profile': PROFILE, 'status': status, 'scratchBytes': scratch_bytes,
            'manifestSha256': file_hash(manifest_path), 'readOnlyRoots': roots, 'controls': rows, 'cleanup': cleanup, 'preflight': gate}


def run_control_suite(manifest_path: Path, scratch_bytes: int) -> tuple[list, dict]:
    require(platform.system() == 'Linux', 'linux namespace preflight failed')
    manifest = load_json(manifest_path, 'malformed namespace manifest')
    found = check_tree(manifest)
    roots = [str(root) for root in found]
    chromium_row = next(row for row in manifest['roots'] if row['role'] == 'chromium')
    chromium = Path(chromium_row['path']) / chromium_row['executable']
    expected = file_hash(chromium)
    nonce = str(os.getpid())
    canary_parent = Path.home() / f'.namespace-canary-{nonce}'
    canary_parent.mkdir(mode=0o700)
    canary = canary_parent / 'private'
    canary.write_text('namespace-canary-' + nonce)
    canary.chmod(0o600)
    rows: list[dict] = []
    try:
        specs = [
            (REQUIRED_CONTROLS[0], [sys.executable, '-c', BROWSER, str(chromium)], 30),
            (REQUIRED_CONTROLS[1], [sys.executable, '-c', EGRESS], 20),
            (REQUIRED_CONTROLS[2], [sys.executable, '-c', PRIVATE, str(canary), roots[0], str(Path.home())], 20),
            (REQUIRED_CONTROLS[3], [sys.executable, '-c', WRITES, roots[0], str(Path.home())], 20),
            (REQUIRED_CONTROLS[4], [sys.executable, '-c', PRIVS], 20),
            (REQUIRED_CONTROLS[5], [sys.executable, '-c', OVERLIMIT], 30),
            (REQUIRED_CONTROLS[6], [sys.executable, '-c', SLEEP], 3),
            (REQUIRED_CONTROLS[7], [sys.executable, '-c', FLOOD], 20),
            (REQUIRED_CONTROLS[8], [sys.executable, '-c', SURVIVOR], 20),
        ]
        for index, (name, inner, limit) in enumerate(specs):
            run = run_contained(inner, f'/run/portfolio-ns-{nonce}-{index}', scratch_bytes, roots, limit)
            seen = last_json(run['output']) or {}
            if name == REQUIRED_CONTROLS[0]:
                ok = clean(run, exit_ok=run['returncode'] == 0) and judge_browser(seen, expected)
            elif name == REQUIRED_CONTROLS[1]:
                ok = clean(run, exit_ok=run['returncode'] == 0) and judge_egress(seen)
            elif name == REQUIRED_CONTROLS[2]:
                host = {'canary_intact': canary.exists() and canary.read_text() == 'namespace-canary-' + nonce}
                ok = clean(run, exit_ok=run['returncode'] == 0) and judge_private(seen, host)
            elif name == REQUIRED_CONTROLS[3]:
                ok = clean(run, exit_ok=run['returncode'] == 0) and judge_writes(seen)
            elif name == REQUIRED_CONTROLS[4]:
                ok = clean(run, exit_ok=run['returncode'] == 0) and judge_privs(seen)
            elif name == REQUIRED_CONTROLS[5]:
                ok = clean(run, exit_ok=run['returncode'] == 0) and judge_overlimit(seen, scratch_bytes)
            elif name == REQUIRED_CONTROLS[6]:
                ok = clean(run, exit_ok=run['returncode'] in (124, 137)) and 3 <= run['elapsed_s'] < 15
            elif name == REQUIRED_CONTROLS[7]:
                ok = run['overflow'] and run['returncode'] in FLOOD_EXITS and not run['wrapper_deadline'] and run['survivors'] == 0 and bool(run['scratch_removed'])
            else:
                ok = clean(run, exit_ok=run['returncode'] == 0) and seen.get('detached_started') is True
            row = {'control': name, 'pass': bool(ok), 'cleanup': bool(run['scratch_removed']) and run['survivors'] == 0}
            if not ok:
                row['output_tail'] = redact(run['output'])
            rows.append(row)
    finally:
        shutil.rmtree(canary_parent)
    mounts_ok = bool(rows) and all(row['cleanup'] is True for row in rows)
    cleanup = {'mountsRemoved': mounts_ok, 'survivors': 0 if mounts_ok else 1, 'unacknowledged': False}
    return rows, cleanup


def write_controls(manifest_path: Path, scratch_bytes: int, out: Path) -> int:
    gate = preflight()
    roots: list[str] = []
    rows: list = []
    cleanup = {'mountsRemoved': False, 'survivors': -1, 'unacknowledged': True}
    status = 'FAIL'
    body: dict | None = None
    try:
        require(type(scratch_bytes) is int and MIN_SCRATCH <= scratch_bytes < CASE_CEILING, 'namespace scratch reservation')
        manifest = load_json(manifest_path, 'malformed namespace manifest')
        roots = [str(root) for root in check_tree(manifest)]
        if not gate['ready']:
            status = 'BLOCKED'
        else:
            rows, cleanup = run_control_suite(manifest_path, scratch_bytes)
            status = 'PASS' if controls_complete(rows) and cleanup == CLEANUP_OK else 'FAIL'
        if status == 'PASS' and not gate['ready']:
            status = 'BLOCKED'
        body = admission_document(status, scratch_bytes, manifest_path, roots, rows, cleanup, gate)
    except Rejected:
        status = 'BLOCKED' if not gate['ready'] else 'FAIL'
        body = {'schema': ADMISSION_SCHEMA, 'profile': PROFILE, 'status': status, 'scratchBytes': scratch_bytes if type(scratch_bytes) is int else 0,
                'readOnlyRoots': roots, 'controls': rows, 'cleanup': cleanup, 'preflight': gate}
    require(body is not None and (body['status'] != 'PASS' or (gate['ready'] and controls_complete(rows) and cleanup == CLEANUP_OK)), 'misleading namespace pass')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(body, indent=2, sort_keys=True) + '\n')
    return 0 if body['status'] == 'PASS' else 3


class NamespaceJob:
    def __init__(self, data: dict, phase: str, scratch: Path, env: dict[str, str], deadline: float):
        self.data, self.phase, self.scratch, self.env, self.deadline = data, phase, scratch, env, deadline
        self.spec = validate(data, phase)
        self.mount = '/run/portfolio-ns-' + uuid.uuid4().hex
        self.attempted = False
        self.acknowledged = False
        self.identity: dict = {'profile': PROFILE, 'mount': self.mount, 'scratchBytes': self.spec['scratchBytes'],
                               'cleaned': False, 'acknowledged': False}

    def _run(self, argv: list[str], timeout: float) -> subprocess.CompletedProcess[str]:
        remaining = self.deadline - time.monotonic()
        require(remaining > 0, 'namespace control deadline')
        result = subprocess.run(argv, env=self.env, capture_output=True, text=True, timeout=min(timeout, remaining))
        self.identity.setdefault('control', []).append({'argv': argv, 'returncode': result.returncode, 'stderr': result.stderr[-500:]})
        require(result.returncode == 0, 'namespace control failed')
        return result

    def prepare(self, argv: list[str], request: str, timeout: float) -> list[str]:
        self.spec = validate(self.data, self.phase)
        self.identity['scratchBytes'] = self.spec['scratchBytes']
        gate = preflight()
        self.identity['preflight'] = gate['checks']
        require(gate['ready'], 'linux namespace preflight failed')
        self.attempted = True
        self._run(['sudo', '-n', 'mkdir', '-m', '0700', '--', self.mount], timeout=3)
        require(Path(self.mount).is_dir(), 'unacknowledged namespace setup')
        self.acknowledged = True
        self.identity['acknowledged'] = True
        limit = int(timeout) - 12
        require(limit > 0, 'namespace control deadline')
        return outer_argv(list(argv), self.mount, self.spec['scratchBytes'], list(self.spec['readOnlyRoots']), limit, os.getuid(), os.getgid(), request)

    def close(self) -> None:
        if not self.attempted:
            self.identity['cleaned'] = True
            return
        require(self.acknowledged, 'unacknowledged namespace setup: cleanup remains unresolved')
        # A successful rmdir also rejects an unexpected remaining host mount (EBUSY).
        self._run(['sudo', '-n', 'rmdir', '--', self.mount], timeout=3)
        require(survivors(self.mount) == 0, 'namespace process survives')
        require(not Path(self.mount).exists(), 'namespace anchor remains')
        self.identity['cleaned'] = True
        self.identity['cleanup'] = dict(CLEANUP_OK)


def self_test() -> None:
    paired = ['/baseline', '/candidate', '/harness', '/chromium']
    argv = outer_argv(['/interpreter', 'probe'], '/run/portfolio-ns-self', MIN_SCRATCH, paired, 18, 1001, 1002, '{"phase":"baseline"}')
    assert argv[:3] == ['sudo', '-n', 'unshare']
    assert {'--net', '--mount', '--pid', '--fork', '--kill-child', '--mount-proc'} <= set(argv)
    start = argv.index(SCRIPT)
    assert argv[start + 1:start + 13] == ['ns', '/run/portfolio-ns-self', '1001', '1002', str(MIN_SCRATCH), str(Path.home()), '18', '4', *paired]
    same = outer_argv(['/interpreter', 'probe'], '/run/portfolio-ns-self', MIN_SCRATCH, ['/src', '/harness', '/chromium'], 18, 1001, 1002)
    assert same[same.index(SCRIPT) + 8] == '3'
    assert argv[-3:] == ['MEASURE_REQUEST={"phase":"baseline"}', '/interpreter', 'probe']
    assert '--no-sandbox' not in argv and '$' not in ''.join(item for item in argv if item != SCRIPT)
    assert 'no-new-privs' in SCRIPT and '--bounding-set=-all' in SCRIPT and 'ip link set lo up' in SCRIPT
    assert judge_egress({'192.0.2.1': 'OSError', '1.1.1.1': 'OSError'})
    assert not judge_egress({'192.0.2.1': 'CONNECTED', '1.1.1.1': 'OSError'})
    assert not judge_browser({'sha256': 'abc', 'access': True, 'version_code': 0, 'loopback': 'OK'}, 'def')
    assert not judge_private({'home_canary': 'READ', 'git_head': 'ENOENT'}, {'canary_intact': True})
    assert not judge_writes({'checkout': 'WRITABLE', 'home': 30, 'scratch': 'WRITABLE'})
    assert not judge_privs({'nnp': 0, 'caps': {}, 'sudo': 'OK', 'setuid0': 'OK', 'mount': 'OK'})
    assert not judge_overlimit({'errno': None, 'mib': 1}, MIN_SCRATCH)
    assert not controls_complete([{'control': name, 'pass': True, 'cleanup': True} for name in REQUIRED_CONTROLS[:-1]])
    passed = [{'control': name, 'pass': True, 'cleanup': True} for name in REQUIRED_CONTROLS]
    passed[0]['pass'] = False
    assert not controls_complete(passed)
    assert platform.system() == 'Linux' or preflight()['ready'] is False
    print('linux_namespace self-test ok (source logic only; not native admission)')


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description='Linux loopback browser namespace transport')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--self-test', action='store_true')
    group.add_argument('--controls', action='store_true')
    parser.add_argument('--manifest', type=Path)
    parser.add_argument('--scratch-bytes', type=int)
    parser.add_argument('--out', type=Path)
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return 0
    if args.manifest is None or args.scratch_bytes is None or args.out is None:
        parser.error('--controls needs --manifest, --scratch-bytes and --out')
    return write_controls(args.manifest, args.scratch_bytes, args.out)


if __name__ == '__main__':
    sys.exit(main())
