// Client-side wrapper that calls the /api/alfred route in "advice" mode
// Cache advice to avoid spamming API on re-renders/state changes
let adviceCache = null;
let adviceCacheKey = null;

async function getFinancialAdvice(budgetList, incomeList, expenseList) {
  try {
    console.log("[getFinancialAdvice] Called with:", { budgetList, incomeList, expenseList });
    
    // Generate cache key to avoid duplicate requests
    const newCacheKey = JSON.stringify({ budgetList, incomeList, expenseList });
    if (adviceCache && adviceCacheKey === newCacheKey) {
      console.log("[getFinancialAdvice] Returning cached advice");
      return adviceCache;
    }

    console.log("[getFinancialAdvice] Making API call to /api/alfred");
    const response = await fetch("/api/alfred", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "advice",
        budgetList,
        incomeList,
        expenseList,
      }),
    });

    console.log("[getFinancialAdvice] Response status:", response.status);

    if (response.status === 429) {
      const errorMsg = "Alfred is temporarily unavailable due to Groq API rate limits. Please try again in a few minutes.";
      console.warn("[getFinancialAdvice] Rate limit detected:", response.status);
      return errorMsg;
    }

    if (!response.ok) {
      const data = await response.json();
      console.error("[getFinancialAdvice] API error:", data);
      return data.error || `Alfred error (HTTP ${response.status}). Please try again shortly.`;
    }

    const data = await response.json();
    console.log("[getFinancialAdvice] API response:", data);
    
    const result = data.response || "Alfred is currently unavailable. Please try again shortly.";
    
    // Cache the result
    adviceCache = result;
    adviceCacheKey = newCacheKey;
    
    return result;
  } catch (error) {
    console.error("[getFinancialAdvice] Fetch error:", error);
    return "Alfred is currently unavailable. Please try again shortly.";
  }
}

export default getFinancialAdvice;
