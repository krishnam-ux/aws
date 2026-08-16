#!/usr/bin/env python3
"""Render production and reference certificates to PNG and compare layouts."""

import os
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF not installed. Installing...", file=sys.stderr)
    os.system(f"{sys.executable} -m pip install --quiet PyMuPDF pillow")
    import fitz

from PIL import Image
import io

def render_pdf_to_png(pdf_path, output_path, dpi=150):
    """Render PDF to PNG at specified DPI."""
    if not Path(pdf_path).exists():
        print(f"ERROR: PDF not found: {pdf_path}")
        return False
    
    try:
        doc = fitz.open(pdf_path)
        page = doc[0]
        
        # Render at DPI
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat)
        
        # Save PNG
        pix.save(output_path)
        
        # Get image info
        img = Image.open(output_path)
        print(f"RENDERED: {output_path}")
        print(f"  Size: {img.width}x{img.height} pixels")
        print(f"  DPI: {dpi}")
        
        doc.close()
        return True
    except Exception as e:
        print(f"ERROR rendering {pdf_path}: {e}", file=sys.stderr)
        return False

def main():
    prod_pdf = Path(__file__).parent / "tmp-cert" / "live-certificate-1786894305790.pdf"
    ref_pdf = Path(__file__).parent / "tmp-cert" / "Aarav-Sharma.pdf"
    
    output_dir = Path(__file__).parent / "tmp-cert-renders"
    output_dir.mkdir(exist_ok=True)
    
    prod_png = output_dir / "production-certificate.png"
    ref_png = output_dir / "reference-certificate.png"
    
    print("=" * 60)
    print("CERTIFICATE RENDERING & COMPARISON")
    print("=" * 60)
    
    # Render production certificate
    print("\n1. Rendering PRODUCTION certificate...")
    if not render_pdf_to_png(str(prod_pdf), str(prod_png), dpi=150):
        print("FAILED to render production certificate")
        sys.exit(1)
    
    # Render reference certificate
    print("\n2. Rendering REFERENCE certificate...")
    if not render_pdf_to_png(str(ref_pdf), str(ref_png), dpi=150):
        print("FAILED to render reference certificate")
        sys.exit(1)
    
    # Load both images
    print("\n3. Comparing layouts...")
    prod_img = Image.open(prod_png)
    ref_img = Image.open(ref_png)
    
    prod_w, prod_h = prod_img.size
    ref_w, ref_h = ref_img.size
    
    print(f"  Production: {prod_w}x{prod_h}")
    print(f"  Reference:  {ref_w}x{ref_h}")
    
    # Check dimensions match (allow 2% tolerance for rendering variation)
    w_diff = abs(prod_w - ref_w)
    h_diff = abs(prod_h - ref_h)
    w_tolerance = int(ref_w * 0.02)
    h_tolerance = int(ref_h * 0.02)
    
    if w_diff > w_tolerance or h_diff > h_tolerance:
        print(f"  WARNING: Dimension mismatch detected")
        print(f"    Width diff: {w_diff}px (tolerance: {w_tolerance}px)")
        print(f"    Height diff: {h_diff}px (tolerance: {h_tolerance}px)")
    else:
        print(f"  ✓ Dimensions match (within tolerance)")
    
    # Check file sizes
    prod_size = Path(prod_png).stat().st_size
    ref_size = Path(ref_png).stat().st_size
    print(f"\n4. File sizes:")
    print(f"  Production PNG: {prod_size} bytes")
    print(f"  Reference PNG:  {ref_size} bytes")
    
    # Basic visual inspection points
    print(f"\n5. Visual inspection points:")
    print(f"  ✓ Production certificate successfully rendered to PNG")
    print(f"  ✓ Reference certificate successfully rendered to PNG")
    print(f"  ✓ Both images available for manual comparison")
    
    print(f"\n6. Output files:")
    print(f"  Production: {prod_png}")
    print(f"  Reference:  {ref_png}")
    
    print("\n" + "=" * 60)
    print("RENDERING COMPLETE - Ready for visual inspection")
    print("=" * 60)

if __name__ == '__main__':
    main()
