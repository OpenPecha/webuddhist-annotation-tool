import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { IoBarChart } from "react-icons/io5";
import { AdminStatisticsCharts } from "../AdminStatisticsCharts";
import { useAdminTextStatistics } from "@/hooks";

export const AdminStatisticsSection: React.FC = () => {
  const { data: adminStats, isLoading: isLoadingAdminStats } =
    useAdminTextStatistics();

  let statsBody: React.ReactNode;
  if (isLoadingAdminStats) {
    statsBody = (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-12">
        <AiOutlineLoading3Quarters className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Gathering statistics…</p>
      </div>
    );
  } else if (adminStats) {
    statsBody = <AdminStatisticsCharts statistics={adminStats} />;
  } else {
    statsBody = (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Statistics could not be loaded.
      </p>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-1 duration-500">
      <header className="max-w-2xl">
        <p className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Statistics
        </p>
        <p className="mt-3 font-sans text-base leading-relaxed text-muted-foreground">
          Corpus health, assignment flow, and rejection signals across the
          annotation pipeline.
        </p>
      </header>

      <Card className="overflow-hidden border-border/80 bg-card/90 shadow-[0_24px_48px_-28px_oklch(0.35_0.04_65/0.25)] backdrop-blur-sm">
        <CardHeader className="border-b border-border/60 bg-gradient-to-br from-card to-muted/20">
          <CardTitle className="flex items-center gap-2 font-display text-xl font-semibold">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <IoBarChart className="h-4 w-4" />
            </span>
            <span>System overview</span>
          </CardTitle>
          <CardDescription className="text-pretty">
            Text status distribution and review metrics (admin-only aggregates).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8">{statsBody}</CardContent>
      </Card>
    </div>
  );
};
