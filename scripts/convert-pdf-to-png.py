import os
import fitz  # PyMuPDF

def convert_pdf_to_png():
    output_dir = os.path.join(os.getcwd(), 'tests', 'output')
    pdf_files = [
        'test-short-name.pdf',
        'test-long-name.pdf',
        'test-long-title.pdf',
        'test-long-description.pdf'
    ]

    for pdf_name in pdf_files:
        pdf_path = os.path.join(output_dir, pdf_name)
        if not os.path.exists(pdf_path):
            print(f"File not found: {pdf_path}")
            continue
        
        doc = fitz.open(pdf_path)
        page = doc.load_page(0)  # Load the first page
        pix = page.get_pixmap(dpi=150)  # Render to pixmap with 150 DPI
        
        png_name = pdf_name.replace('.pdf', '.png')
        png_path = os.path.join(output_dir, png_name)
        pix.save(png_path)
        print(f"Converted {pdf_name} to {png_name}")

if __name__ == '__main__':
    convert_pdf_to_png()
