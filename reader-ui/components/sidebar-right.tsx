import * as React from "react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from "@/components/ui/sidebar"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
    Field,
    FieldContent,
    FieldGroup,
    FieldLabel,
    FieldSet,
} from "@/components/ui/field"
import {
    RadioGroup,
    RadioGroupItem,
} from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"


const BIRADS_SCORE = {
    '1': '1: Normal (no lesion present)',
    '2': '2: Benign (0% likelihood of malignancy)',
    '3': '3: Probably benign (>0% but <=2%)',
    '4A': '4A: Low Suspicion for Malignancy (>2% to <=10%)',
    '4B': '4B: Moderate Suspicion for Malignancy (>10% to <=50%)',
    '4C': '4C: High Suspicion for Malignancy (>50% to <=95%)',
    '5': '5: Highly Suggestive of Malignancy (>95%)',
}

export function SidebarRight({
    isLoading,
    filename,
    metadata,
    modifiedMetadata,
    biradsScore,
    showPredictedResults,
    showPredictButton,
    updateModifiedMetadata,
    updateBiradsScore,
    handleSaveMetadata,
    handlePredictionWithModifiedMetadata,
    ...props
}: React.ComponentProps<typeof Sidebar> &
    {
        isLoading: boolean,
        filename: string | null,
        metadata: {
            malignancy: number;
            shape: number;
            margin: number;
            orientation: number;
            echo: number;
            posterior: number;
        } | null,
        modifiedMetadata: {
            malignancy: number;
            shape: number;
            margin: number;
            orientation: number;
            echo: number;
            posterior: number;
        } | null,
        biradsScore: string | null,
        showPredictedResults: boolean,
        showPredictButton: boolean,
        updateModifiedMetadata: (partial: Partial<{ malignancy: number; shape: number; margin: number; orientation: number; echo: number; posterior: number; }>) => void
        updateBiradsScore: (biradsScore: string) => void
        handleSaveMetadata: () => void
        handlePredictionWithModifiedMetadata: (filename: string) => void
    }) {

    return (
        <Sidebar
            collapsible="none"
            className="sticky top-0 hidden h-svh border-l lg:flex"
            {...props}
        >
            {/* <SidebarHeader className="border-sidebar-border h-16 border-b">
        <NavUser user={data.user} />
      </SidebarHeader> */}
            <SidebarContent>
                <SidebarGroup className={`${showPredictedResults ? '' : 'hidden'}`}>
                    <SidebarGroupLabel>Predicted Results</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <span>Malignancy: </span>
                                    <span className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] text-sm">
                                        {metadata?.malignancy ?? 'N/A'}
                                    </span>
                                </SidebarMenuButton>
                                <SidebarMenuButton>
                                    <span>Shape: </span>
                                    <span className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] text-sm">
                                        {metadata?.shape ?? 'N/A'}
                                    </span>
                                </SidebarMenuButton>
                                <SidebarMenuButton>
                                    <span>Margin: </span>
                                    <span className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] text-sm">
                                        {metadata?.margin ?? 'N/A'}
                                    </span>
                                </SidebarMenuButton>
                                <SidebarMenuButton>
                                    <span>Orientation: </span>
                                    <span className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] text-sm">
                                        {metadata?.orientation ?? 'N/A'}
                                    </span>
                                </SidebarMenuButton>
                                <SidebarMenuButton>
                                    <span>Echo: </span>
                                    <span className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] text-sm">
                                        {metadata?.echo ?? 'N/A'}
                                    </span>
                                </SidebarMenuButton>
                                <SidebarMenuButton>
                                    <span>Posterior: </span>
                                    <span className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] text-sm">
                                        {metadata?.posterior ?? 'N/A'}
                                    </span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarSeparator className={`mx-0 ${showPredictedResults ? '' : 'hidden'}`} />
                <SidebarGroup className={`${showPredictedResults ? '' : 'hidden'}`}>
                    <SidebarGroupLabel>Modify Predicted Results</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-2">
                            <SidebarMenuItem>
                                <div className="flex flex-col items-start gap-4 py-2">
                                    <Label>Shape</Label>
                                    <Input
                                        type="number"
                                        disabled={modifiedMetadata === null || isLoading}
                                        value={modifiedMetadata?.shape ?? 0}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateModifiedMetadata({ shape: Number(e.target.value) })}
                                    />
                                    <Slider
                                        className="w-full"
                                        disabled={modifiedMetadata === null || isLoading}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={[modifiedMetadata?.shape ?? 0]}
                                        onValueChange={(v) => updateModifiedMetadata({ shape: v[0] ?? 0 })}
                                    />
                                </div>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <div className="flex flex-col items-start gap-4 py-2">
                                    <Label>Margin</Label>
                                    <Input
                                        type="number"
                                        disabled={modifiedMetadata === null || isLoading}
                                        value={modifiedMetadata?.margin ?? 0}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateModifiedMetadata({ margin: Number(e.target.value) })}
                                    />
                                    <Slider
                                        className="w-full"
                                        disabled={modifiedMetadata === null || isLoading}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={[modifiedMetadata?.margin ?? 0]}
                                        onValueChange={(v) => updateModifiedMetadata({ margin: v[0] ?? 0 })}
                                    />
                                </div>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <div className="flex flex-col items-start gap-4 py-2">
                                    <Label>Orientation</Label>
                                    <Input
                                        type="number"
                                        disabled={modifiedMetadata === null || isLoading}
                                        value={modifiedMetadata?.orientation ?? 0}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateModifiedMetadata({ orientation: Number(e.target.value) })}
                                    />
                                    <Slider
                                        className="w-full"
                                        disabled={modifiedMetadata === null || isLoading}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={[modifiedMetadata?.orientation ?? 0]}
                                        onValueChange={(v) => updateModifiedMetadata({ orientation: v[0] ?? 0 })}
                                    />
                                </div>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <div className="flex flex-col items-start gap-4 py-2">
                                    <Label>Echo</Label>
                                    <Input
                                        type="number"
                                        disabled={modifiedMetadata === null || isLoading}
                                        value={modifiedMetadata?.echo ?? 0}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateModifiedMetadata({ echo: Number(e.target.value) })}
                                    />
                                    <Slider
                                        className="w-full"
                                        disabled={modifiedMetadata === null || isLoading}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={[modifiedMetadata?.echo ?? 0]}
                                        onValueChange={(v) => updateModifiedMetadata({ echo: v[0] ?? 0 })}
                                    />
                                </div>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <div className="flex flex-col items-start gap-4 py-2">
                                    <Label>Posterior</Label>
                                    <Input
                                        type="number"
                                        disabled={modifiedMetadata === null || isLoading}
                                        value={modifiedMetadata?.posterior ?? 0}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateModifiedMetadata({ posterior: Number(e.target.value) })}
                                    />
                                    <Slider
                                        className="w-full"
                                        disabled={modifiedMetadata === null || isLoading}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={[modifiedMetadata?.posterior ?? 0]}
                                        onValueChange={(v) => updateModifiedMetadata({ posterior: v[0] ?? 0 })}
                                    />
                                </div>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-2">
                            <SidebarMenuItem>
                                <div className="flex flex-col items-start gap-4 py-2">
                                    <FieldGroup>
                                        <FieldSet>
                                            <FieldLabel>BIRADS Score</FieldLabel>
                                            <RadioGroup value={biradsScore} onValueChange={updateBiradsScore}>
                                                {
                                                    Object.entries(BIRADS_SCORE).sort((a, b) => a[0].localeCompare(b[0])).map(([key, value]) => (
                                                        <FieldLabel key={key}>
                                                            <Field orientation="horizontal">
                                                                <RadioGroupItem
                                                                    value={key}
                                                                    disabled={isLoading || filename === null}
                                                                />
                                                                <FieldContent>
                                                                    {value}
                                                                </FieldContent>
                                                            </Field>
                                                        </FieldLabel>
                                                    ))
                                                }
                                            </RadioGroup>
                                        </FieldSet>
                                    </FieldGroup>
                                </div>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="relative">
                {/* Gradient overlay */}
                <div className="absolute -top-10 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-background" />

                <SidebarMenu className="gap-2 py-1 pb-2">
                    <SidebarMenuItem>
                        <Button className={`w-full cursor-pointer ${showPredictButton ? 'bg-primary/80' : 'bg-primary'}`}
                            disabled={isLoading || biradsScore === null}
                            onClick={() => handleSaveMetadata()}
                        >
                            Save
                        </Button>
                    </SidebarMenuItem>
                    <SidebarMenuItem className={`${showPredictButton ? '' : 'hidden'}`}>
                        <Button className='w-full cursor-pointer' disabled={modifiedMetadata === null || isLoading || !showPredictButton || biradsScore === null}
                            onClick={() => filename && handlePredictionWithModifiedMetadata(filename)}
                        >
                            Predict!
                        </Button>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>


        </Sidebar>
    )
}
