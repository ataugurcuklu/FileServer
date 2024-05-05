import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button"
import { TableHead, TableRow, TableHeader, TableCell, TableBody, Table } from "@/components/ui/table"
import { DownloadIcon, SunIcon } from "@radix-ui/react-icons";
import { Progress } from "@/components/ui/progress"

interface File {
    name: string;
    size: number;
    lastModifiedDate: string;
    path: string;
}
interface UploadFileProps {
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
    setProgress: React.Dispatch<React.SetStateAction<number>>;
}
interface RenameFileProps {
    file: string;
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}
interface DeleteFileProps {
    file: string;
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

export default function Component() {
    const [files, setFiles] = useState<File[]>([]);
    const [progress, setProgress] = useState(0);
    const divRef = useRef(null);

    useEffect(() => {
        fetch("/api/files/list")
            .then((response) => response.json())
            .then((data) => {
                setFiles(data.files);
            })
            .catch((error) => console.error(error));
    }, []);

    useEffect(() => {
        let dragCounter = 0;

        const handleDragEnter = (e: DragEvent) => {
            e.preventDefault();
            dragCounter++;
            divRef.current && divRef.current.classList.add('dragging');
        };

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                divRef.current && divRef.current.classList.remove('dragging');
            }
        };

        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            dragCounter = 0;
            divRef.current && divRef.current.classList.remove('dragging');
        };

        window.addEventListener('dragenter', handleDragEnter);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragenter', handleDragEnter);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('drop', handleDrop);
        };
    }, []);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        const droppedFiles = Array.from(e.dataTransfer.files) as unknown[];
        handleFiles(droppedFiles as File[]);
        document.documentElement.classList.remove("dragging");
    };

    const handleFiles = async (fileList: FileList | File[]) => {
        const filesToUpload = Array.from(fileList) as File[];
        for (const file of filesToUpload) {
            const formData = new FormData();
            formData.append("file", file);

            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/files");
            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable) {
                    const progress = (e.loaded / e.total) * 100;
                    setProgress(progress);
                }
            };
            xhr.onload = function () {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    const uploadedFile = {
                        name: response.file.name,
                        size: response.file.size,
                        lastModifiedDate: response.file.lastModifiedDate,
                        path: response.file.path,
                    };
                    setFiles((prevFiles) => [...prevFiles, uploadedFile]);
                    setProgress(0);
                } else {
                    console.error("Upload failed.");
                }
            };
            xhr.onerror = function () {
                console.error("Upload failed.");
            };
            xhr.send(formData);
        }
    };

    return (
        <main className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
            <div
                ref={divRef}
                className="w-full max-w-4xl bg-white rounded-lg shadow-lg dark:bg-gray-800 dark:text-gray-200"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">

                    <h1 className="text-2xl font-bold">
                        File Server
                    </h1>
                    {progress > 0 && <Progress value={progress} className="w-1/4" />}
                    <Button className="shrink-0 w-1/ center" variant="outline" onClick={() => uploadFile({ setFiles, setProgress })}>
                        <UploadIcon className="mr-2 h-5 w-5" />
                        Upload
                    </Button>

                </div>
                <div className="overflow-auto max-h-[80vh] px-6 py-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Last Modified</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {files.map((file, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <FileIcon className="h-5 w-5 shrink-0" />
                                            {file.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatBytes(file.size)}</TableCell>
                                    <TableCell>{new Date(file.lastModifiedDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button className="mr-2" size="icon" variant="outline">
                                            <a href={`/api/files/${file.name}/download`} download>
                                                <DownloadIcon className="h-5 w-5" />
                                            </a>
                                        </Button>
                                        <Button className="mr-2" size="icon" variant="outline" onClick={() => renameFile({ file: file.name, files, setFiles })}>
                                            <PencilIcon className="h-5 w-5" />
                                            <span className="sr-only">Rename</span>
                                        </Button>
                                        <Button className="text-red-500 hover:text-red-600" size="icon" variant="outline" onClick={() => deleteFile({ file: file.name, files, setFiles })}>
                                            <TrashIcon className="h-5 w-5" />
                                            <span className="sr-only">Delete</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <Button className="shrink-0 mr-4 mt-2" variant="outline" onClick={() => toggleDark()}>
                <SunIcon className="h-5 w-5" />
            </Button>
        </main>
    )
}


function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function uploadFile({ setFiles, setProgress }: UploadFileProps) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*/*";
    input.multiple = true;
    input.onchange = async (e) => {
        if (e.target) {
            const files = (e.target as HTMLInputElement).files;
            if (!files) {
                console.error("No files selected.");
                return;
            }

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                const formData = new FormData();
                formData.append("file", file);

                const xhr = new XMLHttpRequest();
                xhr.open("POST", "/api/files");
                xhr.upload.onprogress = function (e) {
                    if (e.lengthComputable) {
                        const progress = (e.loaded / e.total) * 100;
                        setProgress(progress);
                    }
                };
                xhr.onload = function () {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        const uploadedFile = {
                            name: response.file.name,
                            size: response.file.size,
                            lastModifiedDate: response.file.lastModifiedDate,
                            path: response.file.path
                        };
                        setFiles(prevFiles => [...prevFiles, uploadedFile]);
                        setProgress(0);
                    } else {
                        console.error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`);
                    }
                };
                xhr.onerror = function () {
                    console.error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`);
                };
                xhr.send(formData);
            }
        }
    };
    input.click();
}

function toggleDark() {
    document.documentElement.classList.toggle("dark");
}

function deleteFile({ file, files, setFiles }: DeleteFileProps) {
    if (!window.confirm(`Are you sure you want to delete ${file}?`)) {
        return;
    }
    fetch(`/api/files/${file}/delete`, { method: "DELETE" })
        .then((response) => response.json())
        .then(() => {
            setFiles(files.filter(f => f.name !== file));
        })
        .catch((error) => console.error(error));
}

function renameFile({ file, files, setFiles }: RenameFileProps) {
    const newName = prompt("Enter new name for the file:");
    if (!newName) {
        return;
    }
    fetch(`/api/files/${file}/rename`, { method: "PUT", body: newName })
        .then((response) => response.json())
        .then((data) => {
            const { newName } = data;
            setFiles(files.map(f => f.name === file ? { ...f, name: newName } : f));
        })
        .catch((error) => console.error(error));
}

function FileIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
    )
}


function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
        </svg>
    )
}


function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
    )
}


function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
    )
}