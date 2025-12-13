<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let photos: string[] = []; // Array of photo URLs
  export let thumbnails: string[] = []; // Array of thumbnail URLs

  const dispatch = createEventDispatcher<{
    close: void;
    delete: number; // Photo index to delete
  }>();

  let currentIndex = 0;
  let lightboxOpen = false;

  function openLightbox(index: number) {
    currentIndex = index;
    lightboxOpen = true;
  }

  function closeLightbox() {
    lightboxOpen = false;
    dispatch('close');
  }

  function nextPhoto() {
    currentIndex = (currentIndex + 1) % photos.length;
  }

  function prevPhoto() {
    currentIndex = (currentIndex - 1 + photos.length) % photos.length;
  }

  function deletePhoto() {
    if (confirm('Delete this photo?')) {
      dispatch('delete', currentIndex);
      
      if (photos.length <= 1) {
        closeLightbox();
      } else if (currentIndex >= photos.length - 1) {
        currentIndex = photos.length - 2;
      }
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!lightboxOpen) return;

    switch (event.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowLeft':
        prevPhoto();
        break;
      case 'ArrowRight':
        nextPhoto();
        break;
      case 'Delete':
        deletePhoto();
        break;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if photos.length > 0}
  <div class="photo-gallery">
    <div class="thumbnail-grid">
      {#each (thumbnails.length > 0 ? thumbnails : photos) as thumb, index}
        <button
          class="thumbnail"
          on:click={() => openLightbox(index)}
          title="Click to view full size"
        >
          <img src={thumb} alt="Photo {index + 1}" />
        </button>
      {/each}
    </div>

    {#if lightboxOpen}
      <div class="lightbox" on:click={closeLightbox}>
        <button class="close-btn" on:click|stopPropagation={closeLightbox}>
          ✕
        </button>

        <button class="delete-btn" on:click|stopPropagation={deletePhoto}>
          🗑️ Delete
        </button>

        {#if photos.length > 1}
          <button class="nav-btn prev" on:click|stopPropagation={prevPhoto}>
            ‹
          </button>
          
          <button class="nav-btn next" on:click|stopPropagation={nextPhoto}>
            ›
          </button>
        {/if}

        <div class="lightbox-content" on:click|stopPropagation>
          <img src={photos[currentIndex]} alt="Photo {currentIndex + 1}" />
          
          {#if photos.length > 1}
            <div class="photo-counter">
              {currentIndex + 1} / {photos.length}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .photo-gallery {
    width: 100%;
  }

  .thumbnail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .thumbnail {
    aspect-ratio: 1;
    border: 2px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    padding: 0;
    background: #f0f0f0;
    transition: all 0.2s;
  }

  .thumbnail:hover {
    border-color: #4CAF50;
    transform: scale(1.05);
  }

  .thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Lightbox */
  .lightbox {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.2s;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 2rem;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .delete-btn {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background: rgba(255, 59, 48, 0.8);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.2s;
  }

  .delete-btn:hover {
    background: rgba(255, 59, 48, 1);
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 3rem;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .nav-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .nav-btn.prev {
    left: 1rem;
  }

  .nav-btn.next {
    right: 1rem;
  }

  .lightbox-content {
    max-width: 90vw;
    max-height: 90vh;
    position: relative;
  }

  .lightbox-content img {
    max-width: 100%;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 8px;
  }

  .photo-counter {
    position: absolute;
    bottom: -2rem;
    left: 50%;
    transform: translateX(-50%);
    color: white;
    font-size: 0.875rem;
    background: rgba(0, 0, 0, 0.5);
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
  }

  @media (max-width: 640px) {
    .thumbnail-grid {
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    }

    .nav-btn {
      width: 3rem;
      height: 3rem;
      font-size: 2rem;
    }
  }
</style>
