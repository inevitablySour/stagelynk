"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface HierarchicalPickerGroup {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

interface HierarchicalPickerProps {
  groups: HierarchicalPickerGroup[];
  selectedGroupIds: string[];
  selectedChildIds: string[];
  onGroupToggle: (groupId: string) => void;
  onChildToggle: (childId: string) => void;
  /** Caps children selectable per active group (e.g. 3). Omit for no cap. */
  maxChildrenPerGroup?: number;
  /**
   * "filter": any number of groups can be active at once, each shows its own
   * chip row (Discover Talent, listing editors).
   * "single-select-group": picking a new group clears any previously
   * selected group's chip selections (musician's "1 main genre" rule).
   */
  mode: "filter" | "single-select-group";
  groupLabel?: string;
  childLabel?: string;
}

export function HierarchicalPicker({
  groups,
  selectedGroupIds,
  selectedChildIds,
  onGroupToggle,
  onChildToggle,
  maxChildrenPerGroup,
  mode,
  groupLabel = "Category",
  childLabel = "Subcategory",
}: HierarchicalPickerProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeGroups = groups.filter((g) => selectedGroupIds.includes(g.id));
  const childIdsByGroup = (group: HierarchicalPickerGroup) => group.children.filter((c) => selectedChildIds.includes(c.id));

  const handleGroupClick = (groupId: string) => {
    onGroupToggle(groupId);
    setDropdownOpen(false);
  };

  const atCap = (group: HierarchicalPickerGroup) =>
    maxChildrenPerGroup !== undefined && childIdsByGroup(group).length >= maxChildrenPerGroup;

  return (
    <div className="space-y-3">
      <div className="relative inline-block">
        <Button type="button" variant="outline" size="sm" onClick={() => setDropdownOpen((v) => !v)}>
          {groupLabel} <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
        {dropdownOpen && (
          <div className="absolute z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg">
            {groups.map((group) => {
              const isActive = selectedGroupIds.includes(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleGroupClick(group.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50 ${isActive ? "bg-olive-50 font-medium text-olive-700" : "text-stone-700"}`}
                >
                  {group.name}
                  {isActive && <span className="text-xs text-olive-500">Selected</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activeGroups.map((group) => (
        <div key={group.id} className="rounded-lg border border-stone-100 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-stone-500">
              {group.name} · {childLabel}
              {maxChildrenPerGroup !== undefined && ` (up to ${maxChildrenPerGroup})`}
            </p>
            {mode === "filter" && (
              <button type="button" onClick={() => onGroupToggle(group.id)} className="text-stone-400 hover:text-stone-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.children.map((child) => {
              const selected = selectedChildIds.includes(child.id);
              const disabled = !selected && atCap(group);
              return (
                <Badge
                  key={child.id}
                  variant={selected ? "default" : "outline"}
                  className={`cursor-pointer px-2.5 py-1 ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  onClick={() => !disabled && onChildToggle(child.id)}
                >
                  {child.name}
                </Badge>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
