"use client"

import { SidebarLeft } from "@/components/sidebar-left"
import { SidebarRight } from "@/components/sidebar-right"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { useEffect, useReducer, useCallback } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

// Types
interface Metadata {
    malignancy: number;
    shape: number;
    margin: number;
    orientation: number;
    echo: number;
    posterior: number;
}

interface FileItem {
    filename: string;
    date_added: string;
    manually_annotated: boolean;
    visually_annotated: boolean;
    interactive_annotated: boolean;
}

interface MetadataWithBiradsScore extends Partial<Metadata> {
    biradsScore: string;
}

interface MetadataHistoryItem extends MetadataWithBiradsScore {
    order: number;
}

type Mode = 'manual' | 'interactive' | 'visible';

interface AppState {
    isLoading: boolean;
    selectedFilename: string | null;
    showProcessedImage: boolean;
    files: FileItem[];
    originalImage: File | null;
    processedImage: File | null;
    metadata: Metadata | null;
    modifiedMetadata: Metadata | null;
    biradsScore: string | null;
    metadataHistory: MetadataHistoryItem[] | [];
}

// Action types
type AppAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SELECTED_FILENAME'; payload: string | null }
    | { type: 'SET_SHOW_PROCESSED_IMAGE'; payload: boolean }
    | { type: 'SET_FILES'; payload: FileItem[] }
    | { type: 'SET_ORIGINAL_IMAGE'; payload: File | null }
    | { type: 'SET_PROCESSED_IMAGE'; payload: File | null }
    | { type: 'SET_METADATA'; payload: Metadata | null }
    | { type: 'SET_MODIFIED_METADATA'; payload: Metadata | null }
    | { type: 'SET_BIRADS_SCORE'; payload: string | null }
    | { type: 'ADD_TO_METADATA_HISTORY'; payload: MetadataWithBiradsScore }
    | { type: 'RESET_PREDICTION_DATA' }
    | { type: 'RESET_ALL' };

// Initial state
const INITIAL_STATE: AppState = {
    isLoading: false,
    selectedFilename: null,
    showProcessedImage: true,
    files: [],
    originalImage: null,
    processedImage: null,
    metadata: null,
    modifiedMetadata: null,
    biradsScore: null,
    metadataHistory: [],
};

export default function ReaderUI({ mode }: { mode: Mode }) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL!;
    // Reducer function
    function appReducer(state: AppState, action: AppAction): AppState {
        switch (action.type) {
            case 'SET_LOADING':
                return { ...state, isLoading: action.payload };
            case 'SET_SELECTED_FILENAME':
                if (state.isLoading) {
                    return state;
                }
                return { ...state, selectedFilename: action.payload };
            case 'SET_SHOW_PROCESSED_IMAGE':
                return { ...state, showProcessedImage: action.payload };
            case 'SET_FILES':
                return { ...state, files: action.payload };
            case 'SET_ORIGINAL_IMAGE':
                return { ...state, originalImage: action.payload };
            case 'SET_PROCESSED_IMAGE':
                return { ...state, processedImage: action.payload };
            case 'SET_METADATA':
                return { ...state, metadata: action.payload };
            case 'SET_MODIFIED_METADATA':
                return { ...state, modifiedMetadata: action.payload };
            case 'ADD_TO_METADATA_HISTORY':
                return { ...state, metadataHistory: [...state.metadataHistory, { ...action.payload, order: state.metadataHistory.length + 1 }] };
            case 'RESET_PREDICTION_DATA':
                return {
                    ...state,
                    processedImage: null,
                    metadata: null,
                    modifiedMetadata: null,
                    biradsScore: null,
                    showProcessedImage: true,
                    metadataHistory: []
                };
            case 'RESET_ALL':
                return { ...INITIAL_STATE, files: state.files };
            case 'SET_BIRADS_SCORE':
                return { ...state, biradsScore: action.payload };
            default:
                return state;
        }
    }

    const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);

    function base64ToBlob(base64: string, type = "image/png") {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type });
    }

    const getFiles = useCallback(async () => {
        await toast.promise(
            (async () => {
                dispatch({ type: 'SET_LOADING', payload: true });
                dispatch({ type: 'RESET_ALL' });
                try {
                    const headers = new Headers();
                    headers.append("ngrok-skip-browser-warning", 'true');

                    const requestOptions = {
                        method: "GET",
                        headers,
                    };

                    const response = await fetch(`${API_URL}/get-samples`, requestOptions);
                    const data: { files: FileItem[] } = await response.json();
                    dispatch({ type: 'SET_FILES', payload: data.files });
                    return data.files;
                } finally {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            })(),
            {
                loading: "Loading files...",
                success: "Files loaded successfully",
                error: "Failed to load files",
            }
        );
    }, [API_URL]);

    const handlePrediction = useCallback(async (filename: string) => {
        await toast.promise((async () => {
            dispatch({ type: 'SET_LOADING', payload: true });
            dispatch({ type: 'RESET_PREDICTION_DATA' });

            const headers = new Headers();
            headers.append("ngrok-skip-browser-warning", 'true');

            const requestOptions = {
                method: "GET",
                headers: headers,
            };

            const url = new URL(`${API_URL}/predict-image`);
            url.searchParams.append("path", filename);
            url.searchParams.append("includePredictions", mode === 'manual' ? 'false' : 'true');
            const response = await fetch(url.toString(), requestOptions);
            if (!response.ok) {
                const message = `Request failed: ${response.status} ${response.statusText}`;
                throw new Error(message);
            }

            const data: {
                original_image_base64: string;
                image_base64: string | null;
                metadata: Metadata | null;
            } = await response.json();

            const original = base64ToBlob(data.original_image_base64, "image/png");
            const originalFile = new File([original], `${crypto.randomUUID()}.png`, { type: "image/png" });
            if (mode != 'manual' && data.image_base64) {
                const processed = base64ToBlob(data.image_base64, "image/png");
                const processedFile = new File([processed], `${crypto.randomUUID()}.png`, { type: "image/png" });
                dispatch({ type: 'SET_PROCESSED_IMAGE', payload: processedFile });
                dispatch({ type: 'SET_METADATA', payload: data.metadata });
                dispatch({ type: 'SET_MODIFIED_METADATA', payload: data.metadata });
            }


            dispatch({ type: 'SET_SHOW_PROCESSED_IMAGE', payload: true });
            dispatch({ type: 'SET_ORIGINAL_IMAGE', payload: originalFile });
            dispatch({ type: 'SET_LOADING', payload: false });
            return true;
        })(), {
            loading: "Processing image...",
            success: "Image processed successfully, please check the results",
            error: "Failed to process image, please try again",
        });
    }, [API_URL, mode]);

    const handlePredictionWithModifiedMetadata = useCallback(async (filename: string) => {
        await toast.promise((async () => {
            dispatch({ type: 'SET_LOADING', payload: true });

            const headers = new Headers();
            headers.append("ngrok-skip-browser-warning", 'true');

            const requestOptions = {
                method: "GET",
                headers: headers,
            };

            const url = new URL(`${API_URL}/predict-image-with-concepts`);
            url.searchParams.append("path", filename);
            url.searchParams.append("concept_scores", JSON.stringify(state.modifiedMetadata));
            url.searchParams.append("sigmoid_applied", "true");
            const response = await fetch(url.toString(), requestOptions);
            if (!response.ok) {
                const message = `Request failed: ${response.status} ${response.statusText}`;
                throw new Error(message);
            }

            const data: {
                metadata: Metadata;
            } = await response.json();
            
            dispatch({ type: 'ADD_TO_METADATA_HISTORY', payload: { ...state.metadata, biradsScore: state.biradsScore! } });
            dispatch({ type: 'SET_METADATA', payload: data.metadata });
            dispatch({ type: 'SET_MODIFIED_METADATA', payload: data.metadata });
            dispatch({ type: 'SET_LOADING', payload: false });
            return data.metadata;
        })(), {
            loading: "Predicting image again...",
            success: "Image predicted successfully, please check the results",
            error: "Failed to process image, please try again",
        });
    }, [API_URL, state.modifiedMetadata, state.biradsScore, state.metadata]);

    const handleSaveMetadata = useCallback(async () => {
        await toast.promise((async () => {
            dispatch({ type: 'SET_LOADING', payload: true });

            // build the new history manually
            const newEntry = { ...state.metadata, biradsScore: state.biradsScore!, order: state.metadataHistory.length + 1 };
            const newHistory = [...state.metadataHistory, newEntry];

            // dispatch both updates that depend on it
            dispatch({ type: 'ADD_TO_METADATA_HISTORY', payload: newEntry });

            // prepare request
            const headers = new Headers();
            headers.append("ngrok-skip-browser-warning", "true");

            const url = new URL(`${API_URL}/save`);
            url.searchParams.append("path", state.selectedFilename!);
            url.searchParams.append("mode", mode);
            url.searchParams.append("history", JSON.stringify(newHistory));

            const response = await fetch(url.toString(), {
                method: "GET",
                headers,
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status} ${response.statusText}`);
            }

            dispatch({ type: 'SET_LOADING', payload: false });
            dispatch({ type: 'RESET_ALL' });
            getFiles();
            return true;
        })(), {
            loading: "Saving metadata...",
            success: "Metadata saved successfully",
            error: "Failed to save metadata, please try again",
        });
    }, [API_URL, state.selectedFilename, mode, state.metadata, state.biradsScore, state.metadataHistory, getFiles]);


    // Allow right sidebar to update metadata fields in a controlled way
    const updateModifiedMetadata = useCallback((partial: Partial<Metadata>) => {
        const current = state.modifiedMetadata ?? {
            malignancy: 0,
            shape: 0,
            margin: 0,
            orientation: 0,
            echo: 0,
            posterior: 0,
        };
        dispatch({ type: 'SET_MODIFIED_METADATA', payload: { ...current, ...partial } });
    }, [state.modifiedMetadata]);

    const updateBiradsScore = useCallback((biradsScore: string) => {
        dispatch({ type: 'SET_BIRADS_SCORE', payload: biradsScore });
    }, []);

    useEffect(() => {
        getFiles();
    }, [getFiles]);

    useEffect(() => {
        if (state.selectedFilename && !state.isLoading) {
            handlePrediction(state.selectedFilename);
        }
    }, [state.selectedFilename, handlePrediction]);

    return (
        <SidebarProvider>
            <SidebarLeft
                mode={mode}
                isLoading={state.isLoading}
                showImageToggle={mode === 'visible' || mode === 'interactive'}
                showProcessedImage={state.showProcessedImage}
                files={state.files}
                selectedFilename={state.selectedFilename}
                setSelectedFilename={(filename: string) => dispatch({ type: 'SET_SELECTED_FILENAME', payload: filename })}
                setShowProcessedImage={(showProcessedImage: boolean) => dispatch({ type: 'SET_SHOW_PROCESSED_IMAGE', payload: showProcessedImage })}
                getFiles={getFiles}
            />
            <SidebarInset>
                <header className="bg-background sticky top-0 flex h-14 shrink-0 items-center gap-2">
                    <div className="flex flex-1 items-center gap-2 px-3">
                        <SidebarTrigger />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="line-clamp-1">
                                        Visualization Results
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 px-6">
                    {
                        mode === 'manual' ? (
                            state.originalImage ? (
                                <Image
                                    src={URL.createObjectURL(state.originalImage)}
                                    alt="Original Image"
                                    className="w-full h-auto"
                                    width={0}
                                    height={0}
                                />
                            ) : (
                                <>
                                    <Skeleton className="bg-muted/50 mx-auto h-12 w-full max-w-3xl rounded-xl" />
                                    <Skeleton className="bg-muted/50 mx-auto h-[35vh] w-full max-w-3xl rounded-xl" />
                                    <Skeleton className="bg-muted/50 mx-auto h-[15vh] w-full max-w-3xl rounded-xl" />
                                    <Skeleton className="bg-muted/50 mx-auto h-[5vh] w-1/2 max-w-3xl rounded-xl" />
                                    <Skeleton className="bg-muted/50 mx-auto h-[5vh] w-1/3 max-w-3xl rounded-xl" />
                                </>
                            )
                        ) : (
                            state.processedImage && state.originalImage ? (
                                state.showProcessedImage ? (
                                    <Image
                                        src={URL.createObjectURL(state.processedImage)}
                                        alt="Processed Image"
                                        className="w-full h-auto"
                                        width={0}
                                        height={0}
                                    />
                                ) : (
                                    <Image
                                        src={URL.createObjectURL(state.originalImage)}
                                        alt="Original Image"
                                        className="w-full h-auto"
                                        width={0}
                                        height={0}
                                    />
                                )
                            ) : (
                                <>
                                    <Skeleton className="bg-muted/50 mx-auto h-12 w-full max-w-3xl rounded-xl" />
                                    <Skeleton className="bg-muted/50 mx-auto h-[35vh] w-full max-w-3xl rounded-xl" />
                                    <Skeleton className="bg-muted/50 mx-auto h-[15vh] w-full max-w-3xl rounded-xl" />
                                    <Skeleton className="bg-muted/50 mx-auto h-[5vh] w-1/2 max-w-3xl rounded-xl" />
                                    <Skeleton className="bg-muted/50 mx-auto h-[5vh] w-1/3 max-w-3xl rounded-xl" />
                                </>
                            )
                        )}
                </div>
            </SidebarInset>
            <SidebarRight
                isLoading={state.isLoading}
                filename={state.selectedFilename}
                metadata={state.metadata}
                modifiedMetadata={state.modifiedMetadata}
                biradsScore={state.biradsScore}
                showPredictedResults={mode === 'interactive'}
                showPredictButton={mode === 'interactive'}
                updateModifiedMetadata={updateModifiedMetadata}
                updateBiradsScore={updateBiradsScore}
                handleSaveMetadata={handleSaveMetadata}
                handlePredictionWithModifiedMetadata={handlePredictionWithModifiedMetadata}
            />
        </SidebarProvider>
    )
}
