"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export function ChartDateFilter({
  month,
  year,
}: {
  month: number | null;
  year: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (type: "month" | "year" | "last30", value?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (type === "last30") {
      params.delete("month");
      params.delete("year");
    } else if (type === "month" && value) {
      params.set("month", value);
      params.set("year", String(year ?? currentYear));
    } else if (type === "year" && value) {
      params.set("year", value);
      params.set("month", String(month ?? new Date().getMonth() + 1));
    }
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  };

  const isLast30 = month === null && year === null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select
        value={isLast30 ? "last30" : String(month ?? new Date().getMonth() + 1)}
        onValueChange={(v) =>
          v === "last30" ? handleChange("last30") : handleChange("month", v)
        }
      >
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last30">Last 30 days</SelectItem>
          {MONTHS.map((m, i) => (
            <SelectItem key={m} value={String(i + 1)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isLast30 && (
        <Select
          value={year ? String(year) : String(currentYear)}
          onValueChange={(v) => handleChange("year", v)}
        >
          <SelectTrigger className="w-[100px] h-8">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
