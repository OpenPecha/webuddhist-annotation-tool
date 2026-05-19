import React, { useMemo, useState, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { IoList } from "react-icons/io5";
import { useCustomAnnotationLabels } from "@/hooks/useAnnotations";

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
};

const escapeCsvValue = (value: string) => {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
};

const formatCreatorName = (item: {
  first_created_by_full_name?: string;
  first_created_by_username?: string;
  user_count: number;
}) => {
  const name =
    item.first_created_by_full_name?.trim() ||
    item.first_created_by_username?.trim() ||
    "";
  if (!name) return "—";
  if (item.user_count > 1) {
    return `${name} (+${item.user_count - 1} other${item.user_count === 2 ? "" : "s"})`;
  }
  return name;
};

export const AdminCustomAnnotationsSection: React.FC = () => {
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedType, setAppliedType] = useState("all");

  const { data = [], isLoading, error } = useCustomAnnotationLabels();

  const availableTypes = useMemo(() => {
    return data
      .map((item) => item.annotation_type_name?.trim())
      .filter((value): value is string => Boolean(value))
      .filter((value, index, values) => values.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = appliedSearch.trim().toLowerCase();

    return data.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.label.toLowerCase().includes(normalizedSearch) ||
        (item.annotation_type_name || "").toLowerCase().includes(normalizedSearch);
      const matchesType =
        appliedType === "all" || item.annotation_type_name === appliedType;

      return matchesSearch && matchesType;
    });
  }, [appliedSearch, appliedType, data]);

  const handleApplyFilters = () => {
    setAppliedSearch(searchInput);
    setAppliedType(typeFilter);
  };

  const handleExportCsv = () => {
    const header = [
      "label",
      "annotation_type",
      "first_created_by_user_id",
      "first_created_by_username",
      "first_created_by_full_name",
      "creator_usernames",
      "usage_count",
      "user_count",
      "text_count",
      "first_seen_at",
      "last_seen_at",
    ];

    const rows = filteredRows.map((item) => [
      item.label,
      item.annotation_type_name || "",
      item.first_created_by_user_id != null
        ? String(item.first_created_by_user_id)
        : "",
      item.first_created_by_username || "",
      item.first_created_by_full_name || "",
      item.creator_usernames || "",
      String(item.usage_count),
      String(item.user_count),
      String(item.text_count),
      item.first_seen_at,
      item.last_seen_at,
    ]);

    const csvLines = [
      header.map(escapeCsvValue).join(","),
      ...rows.map((row) => row.map((value) => escapeCsvValue(value)).join(",")),
    ];
    const csvContent = `\uFEFF${csvLines.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `custom-annotations-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  let tableBody: ReactNode;
  if (isLoading) {
    tableBody = (
      <div className="flex items-center justify-center py-8">
        <AiOutlineLoading3Quarters className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-blue-600">Loading custom annotations...</span>
      </div>
    );
  } else if (error) {
    tableBody = (
      <div className="py-8 text-center text-red-600">
        {error instanceof Error
          ? error.message
          : "Failed to load custom annotations"}
      </div>
    );
  } else if (filteredRows.length === 0) {
    tableBody = (
      <div className="py-8 text-center text-gray-500">
        <IoList className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <p>No custom annotations found</p>
      </div>
    );
  } else {
    tableBody = (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse">
          <caption className="sr-only">Custom annotations table</caption>
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Label
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                First Created By
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                All Creators
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Used
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Users
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Texts
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                First Seen
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Last Seen
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((item) => (
              <tr
                key={`${item.annotation_type_id || item.annotation_type_name || "unknown"}-${item.label}`}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {item.label}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {item.annotation_type_name || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatCreatorName(item)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {item.creator_usernames || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {item.usage_count}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {item.user_count}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {item.text_count}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatDateTime(item.first_seen_at)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatDateTime(item.last_seen_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card className="w-full overflow-hidden rounded-none border-border/80 bg-card/90 shadow-[0_24px_48px_-28px_oklch(0.35_0.04_65/0.25)] backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IoList className="h-5 w-5" />
          Custom Annotations List
        </CardTitle>
        <CardDescription>
          Unique user-created annotation labels that do not exist in the canonical annotation list
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <input
            type="text"
            placeholder="Search by label or type..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 md:w-72"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 md:w-56"
          >
            <option value="all">All Types</option>
            {availableTypes.map((typeName) => (
              <option key={typeName} value={typeName}>
                {typeName}
              </option>
            ))}
          </select>
          <Button type="button" onClick={handleApplyFilters} className="w-full md:w-auto">
            Apply Filters
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="w-full md:w-auto"
          >
            Export CSV
          </Button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Unique Custom Labels
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {filteredRows.length}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total Uses
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {filteredRows.reduce((sum, item) => sum + item.usage_count, 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Text Coverage
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {filteredRows.reduce((sum, item) => sum + item.text_count, 0)}
            </p>
          </div>
        </div>

        <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
          {tableBody}
        </div>
      </CardContent>
    </Card>
  );
};
