import { useState, useRef, useEffect } from "react";
import AvatarWrapper from "./ui/custom-avatar";
import { useAuth } from "@/auth/use-auth-hook";
import { MdKeyboardArrowDown, MdLogout } from "react-icons/md";
import { Link } from "react-router-dom";

function ProfileArea() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        const target = event.target as Element;
        const isSelectContent = target.closest(
          "[data-radix-popper-content-wrapper]"
        );
        const isSelectTrigger = target.closest("[data-radix-select-trigger]");
        if (isSelectContent || isSelectTrigger) return;
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <AvatarWrapper
          imageUrl={currentUser?.picture}
          name={currentUser?.name}
          size={36}
        />
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-foreground">
            {currentUser?.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentUser?.email}
          </span>
        </div>
        <MdKeyboardArrowDown
          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        style={{ display: isOpen ? "block" : "none" }}
        className="absolute w-full right-0 mt-1 bg-popover border border-border rounded-xl py-2 shadow-lg z-50"
      >
        <Link
          className="flex items-center gap-2 px-4 py-2 mx-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
          to="/logout"
        >
          <MdLogout />
          <span>Logout</span>
        </Link>
      </div>
    </div>
  );
}

export default ProfileArea;
