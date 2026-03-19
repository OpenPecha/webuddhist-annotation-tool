import React from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import OpenPecha from "@/assets/icon.png";

interface AppLoadingProps {
  message?: string;
}

export const AppLoading: React.FC<AppLoadingProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center">
      <div className="flex flex-col items-center space-y-6">
        <div className="flex items-center space-x-3">
          <img src={OpenPecha} alt="OpenPecha" className="w-12 h-12" />
          <h1 className="font-display text-2xl font-semibold text-foreground">
            OpenPecha
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <AiOutlineLoading3Quarters className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-lg">{message}</p>
        </div>
      </div>
    </div>
  );
};
