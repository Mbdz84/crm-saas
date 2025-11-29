import UserTable from "./user-table";
import AddUserModal from "./add-user-modal";

export default function UsersPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Users</h1>
        <AddUserModal />
      </div>

      <UserTable />
    </div>
  );
}