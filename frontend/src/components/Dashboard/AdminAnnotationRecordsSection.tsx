import React, { useMemo, useState, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IoList } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useAllAnnotationLists, useUsers } from "@/hooks";
import { Button } from "@/components/ui/button";

const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString();
};

const toDateInputValue = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
};

const escapeCsvValue = (value: string) => {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
};

export const AdminAnnotationRecordsSection: React.FC = () => {
  const [createdByFilter, setCreatedByFilter] = useState("all");
  const [createdAtFilter, setCreatedAtFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const { data: annotationLists = [], isLoading, error } = useAllAnnotationLists();
  const { data: users = [] } = useUsers();

  const userNameByAuth0Id = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((user) => {
      if (user.auth0_user_id) {
        map.set(user.auth0_user_id, user.full_name || user.username);
      }
    });
    return map;
  }, [users]);

  const getCreatorDisplayName = (createdBy?: string) => {
    if (!createdBy) return "-";
    return userNameByAuth0Id.get(createdBy) || createdBy;
  };

  const availableTypes = useMemo(() => {
    const values = new Set<string>();
    annotationLists.forEach((item) => {
      if (item.type) {
        values.add(item.type);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [annotationLists]);

  const availableCreators = useMemo(() => {
    const values = new Set<string>();
    annotationLists.forEach((item) => {
      const displayName = getCreatorDisplayName(item.created_by);
      if (displayName !== "-") {
        values.add(displayName);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [annotationLists, userNameByAuth0Id]);

  const filteredLists = useMemo(() => {
    return annotationLists.filter((item) => {
      const createdByMatches =
        createdByFilter === "all" ||
        getCreatorDisplayName(item.created_by) === createdByFilter;
      const typeMatches = typeFilter === "all" || item.type === typeFilter;
      const createdAtMatches =
        !createdAtFilter || toDateInputValue(item.created_at) === createdAtFilter;
      return createdByMatches && typeMatches && createdAtMatches;
    });
  }, [annotationLists, createdByFilter, typeFilter, createdAtFilter]);

  const handleExportFiltered = () => {
    const header = ["title", "type", "created_by", "created_at"];
    const rows = filteredLists.map((item) => [
      item.title || "",
      item.type || "",
      getCreatorDisplayName(item.created_by),
      item.created_at || "",
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
      `annotation-records-${new Date().toISOString().slice(0, 10)}.csv`
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
        <AiOutlineLoading3Quarters className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-blue-600">Loading annotation lists...</span>
      </div>
    );
  } else if (error) {
    tableBody = (
      <div className="text-center py-8 text-red-600">
        {error instanceof Error ? error.message : "Failed to load annotation lists"}
      </div>
    );
  } else if (filteredLists.length === 0) {
    tableBody = (
      <div className="text-center py-8 text-gray-500">
        <IoList className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No annotation records found</p>
      </div>
    );
  } else {
    tableBody = (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse">
          <caption className="sr-only">Annotation records table</caption>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Title
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Created By
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Created At
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLists.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{item.title}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{item.type || "-"}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {getCreatorDisplayName(item.created_by)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatDate(item.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card className="w-full rounded-none overflow-hidden border-border/80 bg-card/90 shadow-[0_24px_48px_-28px_oklch(0.35_0.04_65/0.25)] backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IoList className="w-5 h-5" />
          Annotation Records
        </CardTitle>
        <CardDescription>
          View annotation list records and filter by creator, date, and type
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <select
            value={createdByFilter}
            onChange={(e) => setCreatedByFilter(e.target.value)}
            className="w-full md:w-56 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Creators</option>
            {availableCreators.map((creator) => (
              <option key={creator} value={creator}>
                {creator}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={createdAtFilter}
            onChange={(e) => setCreatedAtFilter(e.target.value)}
            className="w-full md:w-48 pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full md:w-48 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            onClick={handleExportFiltered}
            disabled={filteredLists.length === 0}
            className="w-full md:w-auto"
          >
            Export CSV
          </Button>
        </div>
        {tableBody}
      </CardContent>
    </Card>
  );
};

