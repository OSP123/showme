<script lang="ts">
  import { uploadMultipleImages, validateImage, type UploadResult } from './imageUpload';
  import { createEventDispatcher } from 'svelte';

  export let maxPhotos = 5;
  export let disabled = false;

  const dispatch = createEventDispatcher<{
    upload: UploadResult[];
    error: string;
  }>();

  let files: FileList | null = null;
  let uploading = false;
  let uploadProgress: Map<number, number> = new Map();
  let dragOver = false;

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    files = target.files;
    await handleUpload();
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    
    files = event.dataTransfer?.files || null;
    await handleUpload();
  }

  async function handleUpload() {
    if (!files || files.length === 0) return;

    // Validate all files first
    const fileArray = Array.from(files);
    
    if (fileArray.length > maxPhotos) {
      dispatch('error', `Maximum ${maxPhotos} photos allowed`);
      return;
    }

    for (const file of fileArray) {
      const validation = validateImage(file);
      if (!validation.valid) {
        dispatch('error', validation.error!);
        return;
      }
    }

    // Upload
    uploading = true;
    uploadProgress.clear();

    try {
      const results = await uploadMultipleImages(
        fileArray,
        (fileIndex, percent) => {
          uploadProgress.set(fileIndex, percent);
          uploadProgress = new Map(uploadProgress); // Trigger reactivity
        }
      );

      dispatch('upload', results);
      
      // Reset
      files = null;
      uploadProgress.clear();
      
    } catch (error: any) {
      dispatch('error', error.message || 'Upload failed');
    } finally {
      uploading = false;
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }
</script>

<div 
  class="photo-upload"
  class:drag-over={dragOver}
  class:disabled={disabled || uploading}
  on:drop={handleDrop}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
>
  {#if !uploading}
    <label class="upload-label">
      <input
        type="file"
        accept="image/*"
        multiple
        max={maxPhotos}
        disabled={disabled}
        on:change={handleFileSelect}
      />
      
      <div class="upload-prompt">
        <span class="icon">📷</span>
        <span class="text">
          {dragOver ? 'Drop photos here' : 'Click or drag photos'}
        </span>
        <span class="hint">Max {maxPhotos} photos, 5MB each</span>
      </div>
    </label>
  {:else}
    <div class="upload-progress">
      <div class="spinner">⏳</div>
      <div class="status">
        Uploading {Array.from(uploadProgress.keys()).length} of {files?.length || 0} photos...
      </div>
      
      {#each Array.from(uploadProgress.entries()) as [index, percent]}
        <div class="progress-bar">
          <div class="progress-fill" style="width: {percent}%"></div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .photo-upload {
    border: 2px dashed #ccc;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    transition: all 0.3s;
    background: #f9f9f9;
  }

  .photo-upload:hover:not(.disabled) {
    border-color: #666;
    background: #f0f0f0;
  }

  .photo-upload.drag-over {
    border-color: #4CAF50;
    background: #e8f5e9;
  }

  .photo-upload.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .upload-label {
    display: block;
    cursor: pointer;
  }

  .upload-label input[type="file"] {
    display: none;
  }

  .upload-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .icon {
    font-size: 3rem;
  }

  .text {
    font-size: 1.125rem;
    font-weight: 500;
    color: #333;
  }

  .hint {
    font-size: 0.875rem;
    color: #666;
  }

  .upload-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    font-size: 2rem;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .status {
    font-size: 0.875rem;
    color: #666;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #4CAF50;
    transition: width 0.3s;
  }
</style>
