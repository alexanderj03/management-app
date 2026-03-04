import type { TagName, TagColor, Project, NavItem } from "../types";

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

export const projects: Project[] = [
  { name: "Management App", sub: "Dev",       color: "#7c6af7", color2: "#a78bfa", icon: "⚙️", progress: 35 },
  { name: "Portfolio Site",  sub: "Personal",  color: "#f5a623", color2: "#fbbf24", icon: "🎨", progress: 60 },
  { name: "Marketing Docs",  sub: "Work",      color: "#37c98a", color2: "#34d399", icon: "📄", progress: 80 },
  { name: "Mobile App",      sub: "Side proj", color: "#f76a8a", color2: "#fb7185", icon: "📱", progress: 15 },
  { name: "API Redesign",    sub: "Dev",       color: "#5b9cf6", color2: "#93c5fd", icon: "🔌", progress: 50 },
];

export const navMain: NavItem[] = [
  { icon: "🏠", label: "Home",       path: "/home" },
  { icon: "🔔", label: "Inbox",      path: "/inbox" },
  { icon: "📁", label: "Portfolios", path: "/portfolios" },
  { icon: "🎯", label: "Goals",      path: "/goals" },
];