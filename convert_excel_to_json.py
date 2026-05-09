import pandas as pd
import json

# ================================================================
# Chicago L Eats — Excel → JSON converter
# Run this script whenever you update the Excel spreadsheet.
# Output: combined_restaurants.json (upload to your GitHub repo)
# ================================================================

# Update this path to wherever your Excel file lives
file_path = '../../02Chicago_Life/Recommended_Restaurants/Louis_Chicago_Restaurant_List.xlsx'

# 1. Load all three sheets
res_df = pd.read_excel(file_path, sheet_name='Restaurants')
bak_df = pd.read_excel(file_path, sheet_name='Bakeries_Cafe')
bar_df = pd.read_excel(file_path, sheet_name='Bars')

# 2. Rename name columns to match
bak_df = bak_df.rename(columns={'Bakery/Café': 'Restaurants'})
bar_df = bar_df.rename(columns={'Bar': 'Restaurants'})

# 3. Combine
combined_df = pd.concat([res_df, bak_df, bar_df], ignore_index=True)

# 4. Ensure numeric columns are clean
combined_df['Price $'] = pd.to_numeric(combined_df['Price $'], errors='coerce').fillna(0)
combined_df['Ratings (/5)'] = pd.to_numeric(combined_df['Ratings (/5)'], errors='coerce').fillna(0)

# 5. Clean Instagram column:
#    - Keep valid URLs as-is
#    - Replace NaN, empty, or literal 'NA'/'na' with empty string
def clean_instagram(val):
    if pd.isna(val):
        return ''
    s = str(val).strip()
    if s.upper() == 'NA' or s == '':
        return ''
    return s

combined_df['Instagram'] = combined_df['Instagram'].apply(clean_instagram)

# 6. Fill remaining NaN with empty strings
combined_df = combined_df.fillna('')

# 7. Re-index
combined_df['Index'] = range(1, len(combined_df) + 1)

# 8. Save
final_json = combined_df.to_dict(orient='records')
with open('combined_restaurants.json', 'w', encoding='utf-8') as f:
    json.dump(final_json, f, indent=2, ensure_ascii=False)

print(f'✅ Done! {len(final_json)} places exported to combined_restaurants.json')
ig_count = sum(1 for r in final_json if r.get('Instagram'))
print(f'📸 {ig_count} places have Instagram links')
