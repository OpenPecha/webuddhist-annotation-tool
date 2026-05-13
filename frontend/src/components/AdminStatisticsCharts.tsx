import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AdminStaffDetail, AdminTextStatistics } from "@/api/types";

interface AdminStatisticsChartsProps {
  statistics: AdminTextStatistics;
}

const COLORS = {
  available: "#10B981", // green
  progress: "#F59E0B", // amber
  reviewed: "#8B5CF6", // purple
  rejected: "#EF4444", // red
  heavily_rejected: "#F97316", // orange
};

export function AdminStatisticsCharts({
  statistics,
}: Readonly<AdminStatisticsChartsProps>) {
  const staffRoleCounts = statistics.staff_role_counts ?? {
    admin: 0,
    reviewer: 0,
    annotator: 0,
  };
  const staffWorkTotals = statistics.staff_work_totals ?? {
    uploaded_files: 0,
    texts_annotated: 0,
    reviews_completed: 0,
    work_in_progress: 0,
  };
  const staffDetails = statistics.staff_details ?? [];
  const totalStaffUsers = statistics.total_staff_users ?? 0;
  const completionRate = statistics.completion_rate ?? 0;
  const rejectionRate = statistics.rejection_rate ?? 0;
  const avgRejectionsPerText = statistics.avg_rejections_per_text ?? 0;
  const staffRoleData = [
    { name: "Admins", value: staffRoleCounts.admin },
    { name: "Reviewers", value: staffRoleCounts.reviewer },
    { name: "Annotators", value: staffRoleCounts.annotator },
  ];

  const formatStaffName = (staffMember: AdminStaffDetail) =>
    staffMember.full_name?.trim() || staffMember.username;

  const formatRoleLabel = (role: AdminStaffDetail["role"]) =>
    role.charAt(0).toUpperCase() + role.slice(1);

  // Text Status Distribution Data
  const textStatusData = [
    {
      name: "Available",
      value: statistics.available_for_new_users,
      color: COLORS.available,
    },
    {
      name: "In Progress",
      value: statistics.progress,
      color: COLORS.progress,
    },
    {
      name: "Reviewed",
      value: statistics.reviewed,
      color: COLORS.reviewed,
    },
    {
      name: "Heavily Rejected",
      value: statistics.heavily_rejected_texts,
      color: COLORS.heavily_rejected,
    },
  ];

  // Rejection Statistics Data
  const rejectionData = [
    {
      name: "Total Rejections",
      value: statistics.total_rejections,
      color: COLORS.rejected,
    },
    {
      name: "Unique Rejected Texts",
      value: statistics.unique_rejected_texts,
      color: COLORS.heavily_rejected,
    },
  ];

  // Overall Progress Data
  const progressData = [
    {
      name: "Total Texts",
      value: statistics.total,
      fill: "#3B82F6",
    },
    {
      name: "Available",
      value: statistics.available_for_new_users,
      fill: COLORS.available,
    },
    {
      name: "In Progress",
      value: statistics.progress,
      fill: COLORS.progress,
    },
    {
      name: "Completed",
      value: statistics.reviewed,
      fill: COLORS.reviewed,
    },
    {
      name: "Rejected",
      value: statistics.unique_rejected_texts,
      fill: COLORS.rejected,
    },
  ];

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
  }) => {
    if (!cx || !cy || !midAngle || !innerRadius || !outerRadius || !percent)
      return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""}
      </text>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Text Status Distribution */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📊 Text Status Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={textStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {textStatusData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} texts`,
                name,
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Overall Progress Bar Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📈 Overall Progress
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis />
            <Tooltip formatter={(value: number) => [`${value}`, "Count"]} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Rejection Statistics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          ❌ Rejection Statistics
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rejectionData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip formatter={(value: number) => [`${value}`, "Count"]} />
            <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Metrics Summary */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          🔢 Key Metrics
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Active Staff Users</span>
            <span className="text-2xl font-bold text-blue-600">
              {totalStaffUsers}
            </span>
          </div>
          {staffRoleData.map((roleStat) => (
            <div key={roleStat.name} className="flex justify-between items-center">
              <span className="text-gray-600">{roleStat.name}</span>
              <span className="text-lg font-semibold text-slate-700">
                {roleStat.value}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Staff Uploaded Files</span>
              <span className="text-lg font-semibold text-slate-700">
                {staffWorkTotals.uploaded_files}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Staff Texts Annotated</span>
            <span className="text-lg font-semibold text-slate-700">
              {staffWorkTotals.texts_annotated}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Staff Reviews Completed</span>
            <span className="text-lg font-semibold text-slate-700">
              {staffWorkTotals.reviews_completed}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Staff Work In Progress</span>
            <span className="text-lg font-semibold text-slate-700">
              {staffWorkTotals.work_in_progress}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Completion Rate</span>
            <span className="text-2xl font-bold text-green-600">
              {completionRate}
              %
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Rejection Rate</span>
            <span className="text-2xl font-bold text-red-600">
              {rejectionRate}
              %
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Avg Rejections per Text</span>
            <span className="text-2xl font-bold text-orange-600">
              {avgRejectionsPerText}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Staff Work Details
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Only admin, reviewer, and annotator accounts are included here.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Staff Member</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Uploaded Files</th>
                <th className="py-2 pr-4 font-medium">Texts Annotated</th>
                <th className="py-2 pr-4 font-medium">Reviews Completed</th>
                <th className="py-2 font-medium">Work In Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffDetails.map((staffMember) => (
                <tr key={staffMember.id} className="align-top text-gray-700">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-900">
                      {formatStaffName(staffMember)}
                    </div>
                    {staffMember.full_name && (
                      <div className="text-xs text-gray-500">
                        @{staffMember.username}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">{formatRoleLabel(staffMember.role)}</td>
                  <td className="py-3 pr-4">{staffMember.uploaded_files}</td>
                  <td className="py-3 pr-4">{staffMember.texts_annotated}</td>
                  <td className="py-3 pr-4">{staffMember.reviews_completed}</td>
                  <td className="py-3">{staffMember.work_in_progress}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {staffDetails.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-500">
              No active admin, reviewer, or annotator accounts found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
