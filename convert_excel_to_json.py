import pandas as pd
import json


# 1. Load your Excel file
# Suggestion: If the script is in the same folder as the Excel, just use the filename
file_path = '../../02Chicago_Life/Recommended_Restaurants/Louis_Chicago_Restaurant_List.xlsx' 

# 1. Load the data
res_df = pd.read_excel(file_path, sheet_name='Restaurants')
bak_df = pd.read_excel(file_path, sheet_name='Bakeries_Cafe')

# 2. FIX: Rename the column in the bakery dataframe to match the restaurant dataframe
bak_df = bak_df.rename(columns={'Bakery/Café': 'Restaurants'})

# 3. Combine them
combined_df = pd.concat([res_df, bak_df], ignore_index=True)


# ... (after your concat line) ...

# 1. Ensure numbers are numbers (turns 'NA' or empty into 0)
combined_df['Price $'] = pd.to_numeric(combined_df['Price $'], errors='coerce').fillna(0)
combined_df['Ratings (/5)'] = pd.to_numeric(combined_df['Ratings (/5)'], errors='coerce').fillna(0)

# 2. Then fill everything else with empty strings
combined_df = combined_df.fillna('')
combined_df['Index'] = range(1, len(combined_df) + 1)

# 3. Save
final_json = combined_df.to_dict(orient='records')
with open('combined_restaurants.json', 'w', encoding='utf-8') as f:
    json.dump(final_json, f, indent=2, ensure_ascii=False)