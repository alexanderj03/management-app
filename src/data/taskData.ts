import type { TagName, TagColor, NavItem } from "../types";

export const tagColors: Record<TagName, TagColor> = {
  Dev:       { bg: "rgba(124,106,247,0.15)", color: "#a78bfa" },
  Design:    { bg: "rgba(247,106,138,0.15)", color: "#f76a8a" },
  Research:  { bg: "rgba(55,201,138,0.15)",  color: "#37c98a" },
  Marketing: { bg: "rgba(245,166,35,0.15)",  color: "#f5a623" },
  Personal:  { bg: "rgba(91,156,246,0.15)",  color: "#5b9cf6" },
};

export const favColors: string[] = [
  "#f5a623", "#f76a8a", "#37c98a", "#7c6af7",
  "#5b9cf6", "#2dd4bf", "#a78bfa", "#fb923c",
];

export const navMain: NavItem[] = [
  { icon: "🏠", label: "Home",       path: "/home" },
  { icon: "🔔", label: "Capture",      path: "/inbox" },
  { icon: "📁", label: "Portfolios", path: "/portfolios" },
  { icon: "🎯", label: "Goals",      path: "/goals" },
];