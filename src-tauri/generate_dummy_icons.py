import os
import zlib
import struct

def make_png(width, height):
    """Generates a valid minimal transparent PNG image in bytes."""
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('!IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = b'IHDR' + ihdr_data
    png += struct.pack('!I', len(ihdr_data)) + ihdr + struct.pack('!I', zlib.crc32(ihdr) & 0xffffffff)
    
    # IDAT chunk (transparent pixels)
    # 1 byte scanline filter (0) + 4 bytes color (RGBA) per pixel
    row = b'\x00' + b'\x00\x00\x00\x00' * width
    idat_data = zlib.compress(row * height)
    idat = b'IDAT' + idat_data
    png += struct.pack('!I', len(idat_data)) + idat + struct.pack('!I', zlib.crc32(idat) & 0xffffffff)
    
    # IEND chunk
    iend = b'IEND'
    png += struct.pack('!I', 0) + iend + struct.pack('!I', zlib.crc32(iend) & 0xffffffff)
    
    return png

def make_ico(png_bytes):
    """Wraps PNG bytes into a valid Windows ICO format."""
    # ICO Header: Reserved (2 bytes, 0), Type (2 bytes, 1 for ICO), Count (2 bytes, 1 image)
    ico_header = struct.pack('<HHH', 0, 1, 1)
    
    # Directory Entry:
    # Width (1 byte, 32), Height (1 byte, 32), Colors (1 byte, 0), Reserved (1 byte, 0)
    # Planes (2 bytes, 1), BPP (2 bytes, 32), Size (4 bytes, len(png)), Offset (4 bytes, 22)
    ico_dir = struct.pack('<BBBBHHII', 32, 32, 0, 0, 1, 32, len(png_bytes), 22)
    
    return ico_header + ico_dir + png_bytes

def main():
    icons_dir = "icons"
    os.makedirs(icons_dir, exist_ok=True)
    
    # Generate png icons referenced in tauri.conf.json
    png_icons = [
        ("32x32.png", 32),
        ("128x128.png", 128),
        ("128x128@2x.png", 256),
    ]
    
    png_32_bytes = None
    for filename, size in png_icons:
        filepath = os.path.join(icons_dir, filename)
        img_bytes = make_png(size, size)
        if size == 32:
            png_32_bytes = img_bytes
        
        with open(filepath, "wb") as f:
            f.write(img_bytes)
        print(f"Created png icon: {filepath}")
            
    # Generate valid ICO file using the 32x32 PNG image
    ico_path = os.path.join(icons_dir, "icon.ico")
    if png_32_bytes:
        with open(ico_path, "wb") as f:
            f.write(make_ico(png_32_bytes))
        print(f"Created valid ICO icon: {ico_path}")

    # Create empty/mock ICNS for macOS builds
    icns_path = os.path.join(icons_dir, "icon.icns")
    with open(icns_path, "wb") as f:
        f.write(b'icns\x00\x00\x00\x08')
    print(f"Created placeholder ICNS: {icns_path}")

if __name__ == "__main__":
    main()
