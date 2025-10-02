"use client"

import * as React from "react"
import {
    Command,
    RefreshCcw,
    Eye,
    EyeOff,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Badge } from "@/components/ui/badge"

export function SidebarLeft({
    mode,
    isLoading,
    showImageToggle,
    showProcessedImage,
    files,
    selectedFilename,
    setSelectedFilename,
    setShowProcessedImage,
    getFiles,
    ...props
}: React.ComponentProps<typeof Sidebar> &
    {
        mode: 'manual' | 'visible' | 'interactive',
        isLoading: boolean,
        showImageToggle: boolean,
        showProcessedImage: boolean,
        files:
        {
            filename: string;
            date_added: string;
            manually_annotated: boolean;
            visually_annotated: boolean;
            interactive_annotated: boolean;
        }[],
        selectedFilename: string | null,
        setSelectedFilename: (filename: string) => void,
        setShowProcessedImage: (showProcessedImage: boolean) => void,
        getFiles: () => void
    }) {

    return (
        <Sidebar className="border-r-0" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <Command className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">BUS-CBM</span>
                                    <span className="truncate text-xs">Reader UI</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem className="flex items-center justify-between gap-2">
                                <Button
                                    className="flex-1 bg-foreground text-background cursor-pointer"
                                    onClick={getFiles}
                                    disabled={isLoading}
                                >
                                    <RefreshCcw className="mr-2" />
                                    <span>Refresh</span>
                                </Button>
                                {showImageToggle && (
                                    <Toggle
                                        variant="outline"
                                        className="cursor-pointer"
                                        disabled={isLoading}
                                        onClick={() => setShowProcessedImage(!showProcessedImage)}
                                    >
                                        {showProcessedImage ? <Eye /> : <EyeOff />}
                                    </Toggle>
                                )}
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <span>samples/</span>
                            </SidebarMenuButton>
                            <SidebarMenuSub>
                                {files.sort((a, b) => {
                                    if (mode === 'manual') {
                                        if (a.manually_annotated !== b.manually_annotated) {
                                            return a.manually_annotated ? 1 : -1;
                                        }
                                    } else if (mode === 'visible') {
                                        if (a.visually_annotated !== b.visually_annotated) {
                                            return a.visually_annotated ? 1 : -1;
                                        }
                                    } else if (mode === 'interactive') {
                                        if (a.interactive_annotated !== b.interactive_annotated) {
                                            return a.interactive_annotated ? 1 : -1;
                                        }
                                    }
                                    return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
                                })
                                    .map((file) => (
                                        <SidebarMenuSubItem key={file.filename}>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={file.filename === selectedFilename}
                                                onClick={() => setSelectedFilename(file.filename)}
                                                className="cursor-pointer"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="truncate">{file.filename}</span>
                                                    <div className="flex items-center gap-0.5">
                                                        <Badge className={`text-xs w-5 h-5 ${file.manually_annotated ? '' : 'hidden'}`} variant="outline">{file.manually_annotated ? 'M' : ''}</Badge>
                                                        <Badge className={`text-xs w-5 h-5 ${file.visually_annotated ? '' : 'hidden'}`} variant="outline">{file.visually_annotated ? 'V' : ''}</Badge>
                                                        <Badge className={`text-xs w-5 h-5 ${file.interactive_annotated ? '' : 'hidden'}`} variant="outline">{file.interactive_annotated ? 'I' : ''}</Badge>
                                                    </div>
                                                </div>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                            </SidebarMenuSub>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            {/* <SidebarContent>
        <NavFavorites favorites={data.favorites} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent> */}
            <SidebarRail />
        </Sidebar>
    )
}
