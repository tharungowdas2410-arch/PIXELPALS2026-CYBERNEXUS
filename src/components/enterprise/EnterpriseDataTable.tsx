"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  key?: string;
  header: string;
  accessorKey?: string;
  cell?: (row: T) => React.ReactNode;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface FilterOptionItem {
  label: string;
  value: string;
}

export interface FilterOption {
  id?: string;
  key?: string;
  label: string;
  options: FilterOptionItem[];
}

export interface EnterpriseDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  filters?: FilterOption[];
  filterOptions?: FilterOption[];
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyMessage?: string;
  actions?: React.ReactNode;
}

export function EnterpriseDataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  subtitle,
  searchPlaceholder = "Search records...",
  searchKeys,
  filters,
  filterOptions,
  onRowClick,
  pageSize = 10,
  emptyMessage = "No matching records found.",
  actions,
}: EnterpriseDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const activeFilterConfig = filterOptions || filters || [];

  // Filtered & Searched Data
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Search matching
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const keysToSearch = searchKeys || (Object.keys(row) as (keyof T)[]);
        const matchesSearch = keysToSearch.some((k) => {
          const val = row[k];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(query);
        });
        if (!matchesSearch) return false;
      }

      // Faceted Filters matching
      for (const [filterKey, filterValue] of Object.entries(activeFilters)) {
        if (!filterValue || filterValue === "all") continue;
        if (String(row[filterKey]) !== filterValue) return false;
      }

      return true;
    });
  }, [data, searchTerm, searchKeys, activeFilters]);

  // Sorted Data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA || "").localeCompare(String(valB || ""))
        : String(valB || "").localeCompare(String(valA || ""));
    });
  }, [filteredData, sortKey, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const setFilter = (key: string, value: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden flex flex-col text-slate-800">
      {/* Optional Title Section */}
      {title && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-5 border-b border-[#E2E8F0] bg-white">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Control Bar: Search & Filter Chips */}
      <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="pl-9 h-9 text-xs border-[#CBD5E1] bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Faceted Filter Selectors */}
        {activeFilterConfig.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterConfig.map((f) => {
              const filterKey = f.id || f.key || f.label.toLowerCase();
              return (
                <div key={filterKey} className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-600 font-medium">{f.label}:</span>
                  <select
                    value={activeFilters[filterKey] || "all"}
                    onChange={(e) => setFilter(filterKey, e.target.value)}
                    className="h-8 rounded-md border border-[#CBD5E1] bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="all">All</option>
                    {f.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto min-h-[300px]">
        <Table>
          <TableHeader className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <TableRow className="border-b border-[#E2E8F0] hover:bg-transparent">
              {columns.map((col, idx) => {
                const colKey = col.accessorKey || col.key || String(idx);
                return (
                  <TableHead
                    key={colKey}
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wider text-slate-600 h-10",
                      col.sortable && "cursor-pointer hover:text-slate-900 select-none",
                      col.className
                    )}
                    onClick={() => col.sortable && handleSort(colKey)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && (
                        <ArrowUpDown className="h-3 w-3 opacity-60 hover:opacity-100" />
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center text-xs text-slate-400"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, idx) => (
                <TableRow
                  key={row.id || idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    "border-b border-[#F1F5F9] transition-colors",
                    onRowClick && "cursor-pointer hover:bg-[#F1F5F9]"
                  )}
                >
                  {columns.map((col, cIdx) => {
                    const colKey = col.accessorKey || col.key || String(cIdx);
                    const cellContent = col.cell
                      ? col.cell(row)
                      : col.render
                      ? col.render(row)
                      : String(row[colKey] ?? "—");

                    return (
                      <TableCell
                        key={colKey}
                        className={cn("text-xs text-slate-700 py-3", col.className)}
                      >
                        {cellContent}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing{" "}
          <span className="font-semibold text-slate-800">
            {sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-slate-800">
            {Math.min(currentPage * pageSize, sortedData.length)}
          </span>{" "}
          of <span className="font-semibold text-slate-800">{sortedData.length}</span> entries
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-7 w-7 p-0 border-[#CBD5E1] bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-mono text-xs px-2 font-medium text-slate-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-7 w-7 p-0 border-[#CBD5E1] bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
