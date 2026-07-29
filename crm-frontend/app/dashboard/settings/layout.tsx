import SettingsTabs from "@/components/settings/settings-tabs";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-4 md:px-6 pt-4">
        <SettingsTabs />
      </div>
      {children}
    </div>
  );
}
