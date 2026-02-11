import os
import json
import google.generativeai as genai

api_key = os.environ.get("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

SYSTEM_INSTRUCTION = """
You are a senior Singaporean Mortgage Banker (SmartSAY Advisor). 
Analyze the provided financial calculation JSON for a property client.

Your Goal: Write a brief, professional executive summary (3-4 sentences).

Guidelines:
1. Tone: Empathetic, professional.
2. For BUYERS: Focus on TDSR/MSR, Cash Top-up, and Grants.
3. For SELLERS (Standard): Focus on Net Cash Proceeds.
4. For SENIORS (55+): You MUST mention if they met the Full Retirement Sum (FRS) in their RA. Explain how much of their CPF refund went to RA vs OA.
5. Rules: Use Singapore terms (CPF, MSR, TDSR, HDB, RA, OA). No markdown.
"""

def get_working_model_name():
    try:
        models = [m for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        for m in models:
            if 'flash' in m.name: return m.name
        for m in models:
            if 'pro' in m.name: return m.name
        if models: return models[0].name
    except:
        pass
    return 'models/gemini-pro'

def generate_analysis(data: dict):
    if not api_key:
        return "⚠️ Error: No Google API Key found."

    # --- PREPARE DATA ---
    transaction_type = "Purchase"
    if "net_cash_proceeds" in data:
        transaction_type = "Senior Sale" if data.get("is_senior") else "Sale"
    
    summary_data = {"transaction": transaction_type, "figures": {}}

    if transaction_type == "Purchase":
        summary_data["figures"] = {
            "income": data.get("gross_income", 0),
            "property": data.get("property_type", "hdb"),
            "loan_eligible": data.get("max_loan", 0),
            "max_budget": data.get("max_purchase_budget", 0),
            "cash_topup_monthly": data.get("monthly_cash_topup", 0)
        }
    elif transaction_type == "Senior Sale":
        summary_data["figures"] = {
            "net_cash": data.get("net_cash_proceeds", 0),
            "owner1_to_ra": data.get("owner1_to_ra", 0),
            "owner1_to_oa": data.get("owner1_to_oa", 0),
            "owner1_met_frs": data.get("owner1_met_frs", False)
        }
    else:
        summary_data["figures"] = {
            "net_cash": data.get("net_cash_proceeds", 0),
            "cpf_refunded": data.get("total_cpf_refund", 0)
        }

    full_prompt = f"{SYSTEM_INSTRUCTION}\n\nClient Data:\n{json.dumps(summary_data)}"

    try:
        model_name = get_working_model_name()
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        return f"AI Error: {str(e)}"
