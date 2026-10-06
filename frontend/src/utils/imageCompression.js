export const MAX_HORSE_IMAGE_BYTES = 500 * 1024;
export const MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;

const canvasToBlob = (canvas, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob?.type === 'image/webp') resolve(blob);
    else reject(new Error('Không thể nén ảnh này.'));
  }, 'image/webp', quality);
});

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Không thể đọc ảnh này.'));
  };
  image.src = url;
});

export async function compressHorseImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chỉ nhận ảnh JPG, PNG hoặc WebP.');
  if (!file.size || file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error('Ảnh gốc phải nhỏ hơn 25 MB.');
  const image = await loadImage(file);
  const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
  let width = Math.max(1, Math.round(image.naturalWidth * scale));
  let height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không hỗ trợ nén ảnh.');

  const qualities = [0.86, 0.76, 0.66, 0.56, 0.46, 0.36, 0.26, 0.16, 0.08];
  while (width >= 240 && height >= 240) {
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size < MAX_HORSE_IMAGE_BYTES) {
        const baseName = file.name.replace(/\.[^.]+$/, '') || 'horse-photo';
        return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
      }
    }
    width = Math.round(width * 0.8);
    height = Math.round(height * 0.8);
  }

  throw new Error('Không thể nén ảnh xuống dưới 500 KB. Vui lòng chọn ảnh khác.');
}
