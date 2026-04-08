import pandas as pd
import json


# 1. Load your Excel file
# Suggestion: If the script is in the same folder as the Excel, just use the filename
file_path = '../../02Chicago_Life/Recommended_Restaurants/Louis_Chicago_Restaurant_List.xlsx'
res_df = pd.read_excel(file_path, sheet_name='Restaurants')
bak_df = pd.read_excel(file_path, sheet_name='Bakeries_Cafe')

# 2. Match column names
bak_df = bak_df.rename(columns={'Bakery/Café': 'Restaurants'})

# 3. Combine
combined_df = pd.concat([res_df, bak_df], ignore_index=True)

# 4. Handle numbers (This turns your "NA" prices into 0)
combined_df['Price $'] = pd.to_numeric(combined_df['Price $'], errors='coerce').fillna(0)
combined_df['Ratings (/5)'] = pd.to_numeric(combined_df['Ratings (/5)'], errors='coerce').fillna(0)

# 5. THE FIX: Fill empty text cells with "" 
# This prevents the "No restaurants match" error
combined_df = combined_df.fillna('')

# 6. Final Indexing
combined_df['Index'] = range(1, len(combined_df) + 1)

# 7. Save
final_json = combined_df.to_dict(orient='records')
with open('combined_restaurants.json', 'w', encoding='utf-8') as f:
    json.dump(final_json, f, indent=2, ensure_ascii=False)

print("Script finished! Refresh your browser now.")