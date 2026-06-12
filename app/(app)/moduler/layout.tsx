import { ModuleSwitcher } from '@/components/module-switcher';

export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <ModuleSwitcher />
      {children}
    </div>
  );
}
