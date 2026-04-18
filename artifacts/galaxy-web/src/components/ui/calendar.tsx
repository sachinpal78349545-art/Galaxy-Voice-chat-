"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  buttonVariant = "ghost",
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      classNames={{
        root: "w-fit",
        months: "relative flex flex-col gap-4 md:flex-row",
        month: "flex w-full flex-col gap-4",
        nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
        nav_button_previous: cn("h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50", buttonVariant ? "" : ""),
        nav_button_next: cn("h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50", buttonVariant ? "" : ""),
        month_caption: "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]",
        dropdowns: "flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium",
        dropdown_root: "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
        dropdown: "bg-popover absolute inset-0 opacity-0",
        caption_label: "select-none font-medium",
        table: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground flex-1 select-none rounded-md text-[0.8rem] font-normal",
        week: "mt-2 flex w-full",
        week_number_header: "w-[--cell-size] select-none",
        week_number: "text-muted-foreground select-none text-[0.8rem]",
        day: "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
        range_start: "bg-accent rounded-l-md",
        range_middle: "rounded-none",
        range_end: "bg-accent rounded-r-md",
        today: "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
        outside: "text-muted-foreground aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Icon: ({ className, ...props }) => {
          return <ChevronDownIcon className={cn("size-4", className)} {...props} />
        },
        ...components,
      }}
      {...props}
    />
  )
}

export { Calendar }
