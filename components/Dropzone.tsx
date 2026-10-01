"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

interface DropzoneProps {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly buttonLabel?: string;
  readonly accept?: string;
  readonly multiple?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly onFiles: (files: ReadonlyArray<File>) => void;
}

export function Dropzone({
  id,
  title,
  description,
  buttonLabel = "파일 선택",
  accept,
  multiple = true,
  disabled = false,
  className = "",
  onFiles,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const helpId = `${id}-help`;

  const emit = (files: ReadonlyArray<File>): void => {
    // 드롭은 input의 accept/multiple을 거치지 않으므로, 파일 검증은 onFiles 쪽 책임이다.
    if (!disabled && files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>): void => {
    emit(Array.from(event.target.files ?? []));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(false);
    emit(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      className={`rounded-2xl border border-dashed px-6 py-9 text-center transition-colors ${isDragging && !disabled ? "border-cyan-400 bg-cyan-400/10" : "border-white/20 bg-white/3 hover:border-white/35"} ${disabled ? "opacity-50" : ""} ${className}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleFileInput}
        className="sr-only"
        aria-describedby={description ? helpId : undefined}
      />
      <p className="text-base font-semibold">{title}</p>
      {description && (
        <p id={helpId} className="mt-1 text-sm text-gray-400">
          {description}
        </p>
      )}
      <label
        htmlFor={id}
        className={`mt-5 inline-flex rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-black transition focus-within:ring-2 focus-within:ring-cyan-300 ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-cyan-300"}`}
      >
        {buttonLabel}
      </label>
    </div>
  );
}
