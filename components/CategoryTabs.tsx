"use client";

import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  active: string;
  onChange: (id: string) => void;
};

export default function CategoryTabs({ categories, active, onChange }: Props) {
  const tabs: Category[] = [{ id: "todas", name: "Todas" }, ...categories];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((category) => {
        const isActive = category.id === active;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            }`}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
