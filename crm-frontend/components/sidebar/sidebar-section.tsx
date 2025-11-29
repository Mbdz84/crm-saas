interface SidebarSectionProps {
  title: string;
  collapsed?: boolean;
  children: React.ReactNode;
}

export default function SidebarSection({ title, collapsed, children }: SidebarSectionProps) {
  return (
    <div>
      {!collapsed && (
        <h4 className="px-4 mb-2 text-xs font-semibold uppercase text-gray-500">
          {title}
        </h4>
      )}
      <div>{children}</div>
    </div>
  );
}