import type { ReactNode, SVGProps } from 'react';

export type OperationalIconName =
  | 'alert'
  | 'archive'
  | 'book'
  | 'briefcase'
  | 'checklist'
  | 'chevron'
  | 'clipboard'
  | 'document'
  | 'download'
  | 'home'
  | 'info'
  | 'map'
  | 'more'
  | 'radio'
  | 'search'
  | 'shield'
  | 'spark'
  | 'status';

type IconProps = SVGProps<SVGSVGElement> & {
  name: OperationalIconName;
};

const paths: Record<OperationalIconName, ReactNode> = {
  alert: (
    <>
      <path d="M12 3.5 3.5 19h17L12 3.5Z" />
      <path d="M12 8.5v5" />
      <path d="M12 16.7h.01" />
    </>
  ),
  archive: (
    <>
      <path d="M4 7.5h16" />
      <path d="M5.5 7.5 6.8 19h10.4l1.3-11.5" />
      <path d="M8 4h8l1 3.5H7L8 4Z" />
      <path d="M9.5 11h5" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5h7a3 3 0 0 1 3 3V20H8a3 3 0 0 0-3 3V4.5Z" />
      <path d="M15 7.5a3 3 0 0 1 3-3h1v16.5h-4" />
    </>
  ),
  briefcase: (
    <>
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <path d="M4.5 7h15v13h-15z" />
      <path d="M4.5 11.5h15" />
      <path d="M10 11.5v1.8h4v-1.8" />
    </>
  ),
  checklist: (
    <>
      <path d="M6 4.5h12v17H6z" />
      <path d="m8.5 9 1.4 1.4 2.4-2.8" />
      <path d="M13.5 9.2H16" />
      <path d="m8.5 14.5 1.4 1.4 2.4-2.8" />
      <path d="M13.5 14.7H16" />
    </>
  ),
  chevron: <path d="m9 5.5 6.5 6.5L9 18.5" />,
  clipboard: (
    <>
      <path d="M8.5 5.5h7" />
      <path d="M9 4h6l1 3H8l1-3Z" />
      <path d="M6 6.5h12v15H6z" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </>
  ),
  document: (
    <>
      <path d="M7 4h7l5 5v15H7z" />
      <path d="M14 4v6h5" />
      <path d="M10 14h6" />
      <path d="M10 18h6" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M5 19.5h14" />
    </>
  ),
  home: (
    <>
      <path d="M4.5 11.5 12 5l7.5 6.5" />
      <path d="M6.5 10.5V20h15V10.5" transform="translate(-2)" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  info: (
    <>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M12 10.5V16" />
      <path d="M12 7.5h.01" />
    </>
  ),
  map: (
    <>
      <path d="m5 6 5-2 5 2 4-2v15l-4 2-5-2-5 2V6Z" />
      <path d="M10 4v15" />
      <path d="M15 6v15" />
    </>
  ),
  more: (
    <>
      <path d="M5 12h.01" />
      <path d="M12 12h.01" />
      <path d="M19 12h.01" />
    </>
  ),
  radio: (
    <>
      <path d="M7.5 15.5a6.4 6.4 0 0 1 0-9" />
      <path d="M16.5 6.5a6.4 6.4 0 0 1 0 9" />
      <path d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
      <path d="M12 14v6" />
    </>
  ),
  search: (
    <>
      <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" />
      <path d="m16 16 5 5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.5-2.8 7.9-7 9.8-4.2-1.9-7-5.3-7-9.8V6l7-2.5Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3.5 13.8 9 19 12l-5.2 3L12 20.5 10.2 15 5 12l5.2-3L12 3.5Z" />
      <path d="M19.5 4.5v4" />
      <path d="M17.5 6.5h4" />
    </>
  ),
  status: (
    <>
      <path d="M4.5 16.5h15" />
      <path d="M6 16.5V12" />
      <path d="M10 16.5V8" />
      <path d="M14 16.5v-6" />
      <path d="M18 16.5V5" />
      <path d="M4.5 20h15" />
    </>
  ),
};

export function OperationalIcon({ name, className = 'h-5 w-5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      className={className}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
