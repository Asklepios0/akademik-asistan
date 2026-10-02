import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_academic_logo(size=1024, is_foreground=False):
    # Create canvas (transparent for foreground, gradient for full icon)
    if is_foreground:
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    else:
        img = Image.new('RGBA', (size, size), (15, 23, 42, 255)) # #0F172A
    
    draw = ImageDraw.Draw(img)
    
    scale = size / 1024.0

    if not is_foreground:
        # Background gradient and rounded square
        for r in range(int(size * 0.7), 0, -5):
            alpha = int(255 * (1 - (r / (size * 0.7)) ** 1.5))
            cyan_tint = (56, 189, 248, max(0, min(60, int(alpha * 0.3))))
            draw.ellipse(
                [size * 0.5 - r, size * 0.5 - r, size * 0.5 + r, size * 0.5 + r],
                fill=cyan_tint
            )

    cx = size * 0.5
    cy = size * 0.48

    # Draw Academic Open Book Base (Lower Part)
    # Left page & Right page
    book_w = 460 * scale
    book_h = 160 * scale
    book_top = cy + 90 * scale

    left_page = [
        (cx - 10 * scale, book_top + 30 * scale),
        (cx - book_w * 0.5, book_top),
        (cx - book_w * 0.52, book_top + book_h),
        (cx - 10 * scale, book_top + book_h + 30 * scale),
    ]
    right_page = [
        (cx + 10 * scale, book_top + 30 * scale),
        (cx + book_w * 0.5, book_top),
        (cx + book_w * 0.52, book_top + book_h),
        (cx + 10 * scale, book_top + book_h + 30 * scale),
    ]
    draw.polygon(left_page, fill=(30, 41, 59, 255), outline=(56, 189, 248, 200), width=int(4 * scale))
    draw.polygon(right_page, fill=(30, 41, 59, 255), outline=(56, 189, 248, 200), width=int(4 * scale))

    # Page lines
    for i in range(3):
        y_offset = (30 + i * 35) * scale
        draw.line([cx - book_w * 0.42, book_top + y_offset, cx - 40 * scale, book_top + y_offset + 15 * scale], fill=(148, 163, 184, 180), width=int(3 * scale))
        draw.line([cx + 40 * scale, book_top + y_offset + 15 * scale, cx + book_w * 0.42, book_top + y_offset], fill=(148, 163, 184, 180), width=int(3 * scale))

    # Draw Cap Skull Underneath
    cap_skull = [
        (cx - 160 * scale, cy - 20 * scale),
        (cx + 160 * scale, cy - 20 * scale),
        (cx + 120 * scale, cy + 90 * scale),
        (cx - 120 * scale, cy + 90 * scale),
    ]
    draw.polygon(cap_skull, fill=(15, 23, 42, 255), outline=(59, 130, 246, 255), width=int(5 * scale))

    # Mortarboard Rhombus (Graduation Cap Top)
    cap_top_y = cy - 110 * scale
    cap_diamond = [
        (cx, cap_top_y),                      # Top point
        (cx + 340 * scale, cap_top_y + 110 * scale), # Right point
        (cx, cap_top_y + 220 * scale),        # Bottom point
        (cx - 340 * scale, cap_top_y + 110 * scale), # Left point
    ]
    # Draw shadow
    shadow_offset = 12 * scale
    shadow_diamond = [(x, y + shadow_offset) for (x, y) in cap_diamond]
    draw.polygon(shadow_diamond, fill=(2, 6, 23, 180))
    # Cap body
    draw.polygon(cap_diamond, fill=(2, 132, 199, 255), outline=(56, 189, 248, 255), width=int(6 * scale))

    # Cap Top Highlight Accent
    inner_diamond = [
        (cx, cap_top_y + 25 * scale),
        (cx + 280 * scale, cap_top_y + 110 * scale),
        (cx, cap_top_y + 195 * scale),
        (cx - 280 * scale, cap_top_y + 110 * scale),
    ]
    draw.polygon(inner_diamond, fill=(14, 165, 233, 230))

    # Center Golden Button
    btn_r = 20 * scale
    draw.ellipse([cx - btn_r, cap_top_y + 110 * scale - btn_r, cx + btn_r, cap_top_y + 110 * scale + btn_r], fill=(245, 158, 11, 255), outline=(253, 230, 138, 255), width=int(3 * scale))

    # Golden Tassel Hanging
    tassel_pts = [
        (cx, cap_top_y + 110 * scale),
        (cx + 120 * scale, cap_top_y + 150 * scale),
        (cx + 210 * scale, cap_top_y + 240 * scale),
        (cx + 230 * scale, cap_top_y + 320 * scale),
    ]
    for i in range(len(tassel_pts) - 1):
        draw.line([tassel_pts[i], tassel_pts[i+1]], fill=(245, 158, 11, 255), width=int(7 * scale))

    # Tassel Fringe Brush
    fringe_x = cx + 230 * scale
    fringe_y = cap_top_y + 320 * scale
    draw.polygon([
        (fringe_x - 18 * scale, fringe_y),
        (fringe_x + 18 * scale, fringe_y),
        (fringe_x + 28 * scale, fringe_y + 70 * scale),
        (fringe_x - 28 * scale, fringe_y + 70 * scale)
    ], fill=(251, 191, 36, 255), outline=(245, 158, 11, 255), width=int(2 * scale))

    # AI Sparkles (4-Point Diamond Star at top right of cap)
    def draw_sparkle(sx, sy, rad):
        sparkle_pts = [
            (sx, sy - rad),
            (sx + rad * 0.28, sy - rad * 0.28),
            (sx + rad, sy),
            (sx + rad * 0.28, sy + rad * 0.28),
            (sx, sy + rad),
            (sx - rad * 0.28, sy + rad * 0.28),
            (sx - rad, sy),
            (sx - rad * 0.28, sy - rad * 0.28)
        ]
        draw.polygon(sparkle_pts, fill=(255, 255, 255, 255), outline=(56, 189, 248, 255), width=int(2 * scale))
        # Center glow dot
        draw.ellipse([sx - rad * 0.2, sy - rad * 0.2, sx + rad * 0.2, sy + rad * 0.2], fill=(255, 255, 255, 255))

    # Large AI Spark
    draw_sparkle(cx + 250 * scale, cy - 140 * scale, 65 * scale)
    # Small secondary spark
    draw_sparkle(cx - 240 * scale, cy - 90 * scale, 40 * scale)
    # Little tertiary spark
    draw_sparkle(cx + 310 * scale, cy - 60 * scale, 26 * scale)

    return img

def main():
    print("Generating Academic Assistant brand assets...")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Main Icon (1024x1024)
    icon_1024 = create_academic_logo(1024, is_foreground=False)
    icon_path = os.path.join(base_dir, 'assets', 'icon.png')
    icon_1024.save(icon_path, 'PNG')
    print("Saved:", icon_path)

    # 2. Foreground Adaptive Icon (512x512, transparent)
    fg_512 = create_academic_logo(512, is_foreground=True)
    fg_path = os.path.join(base_dir, 'assets', 'android-icon-foreground.png')
    fg_512.save(fg_path, 'PNG')
    print("Saved:", fg_path)

    # 3. Splash Icon (512x512)
    splash_512 = create_academic_logo(512, is_foreground=False)
    splash_path = os.path.join(base_dir, 'assets', 'splash-icon.png')
    splash_512.save(splash_path, 'PNG')
    print("Saved:", splash_path)

    # 4. Background (512x512 solid #0F172A)
    bg_512 = Image.new('RGBA', (512, 512), (15, 23, 42, 255))
    bg_path = os.path.join(base_dir, 'assets', 'android-icon-background.png')
    bg_512.save(bg_path, 'PNG')
    print("Saved:", bg_path)

    # 5. Replace Android Drawable splashscreen_logo.png
    drawable_sizes = {
        'drawable-mdpi': 160,
        'drawable-hdpi': 240,
        'drawable-xhdpi': 320,
        'drawable-xxhdpi': 480,
        'drawable-xxxhdpi': 640
    }
    for folder, d_size in drawable_sizes.items():
        folder_path = os.path.join(base_dir, 'android', 'app', 'src', 'main', 'res', folder)
        if os.path.exists(folder_path):
            img_resized = fg_512.resize((d_size, d_size), Image.Resampling.LANCZOS)
            target = os.path.join(folder_path, 'splashscreen_logo.png')
            img_resized.save(target, 'PNG')
            print("Updated splashscreen_logo:", target)

    # 6. Replace Mipmap Launcher Icons
    mipmap_sizes = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192
    }
    for folder, m_size in mipmap_sizes.items():
        folder_path = os.path.join(base_dir, 'android', 'app', 'src', 'main', 'res', folder)
        if os.path.exists(folder_path):
            # Regular Launcher
            launcher_img = icon_1024.resize((m_size, m_size), Image.Resampling.LANCZOS)
            launcher_target = os.path.join(folder_path, 'ic_launcher.webp')
            launcher_img.save(launcher_target, 'WEBP')

            # Round Launcher
            mask = Image.new('L', (m_size, m_size), 0)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.ellipse((0, 0, m_size, m_size), fill=255)
            round_img = Image.new('RGBA', (m_size, m_size), (0, 0, 0, 0))
            round_img.paste(launcher_img, (0, 0), mask=mask)
            round_target = os.path.join(folder_path, 'ic_launcher_round.webp')
            round_img.save(round_target, 'WEBP')

            # Foreground
            fg_resized = fg_512.resize((m_size, m_size), Image.Resampling.LANCZOS)
            fg_target = os.path.join(folder_path, 'ic_launcher_foreground.webp')
            fg_resized.save(fg_target, 'WEBP')
            print("Updated mipmap icons in:", folder)

    print("ALL LOGO & SPLASH ASSETS SUCCESSFULLY REGENERATED!")

if __name__ == '__main__':
    main()
