import { NextResponse } from "next/server";
import Groq from "groq-sdk";

// const groq = new Groq({
//   apiKey: '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', //ayan's key
// });

const groq = new Groq({
  apiKey: "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", // my key
});

export async function POST(request) {
  try {
    console.log("[Alfred Route] POST request received");
    
    // if (!process.env.GROQ_API_KEY) {
    //   console.error("[Alfred Route] GROQ_API_KEY is not configured");
    //   return NextResponse.json(
    //     { error: "Groq API key is not configured." },
    //     { status: 500 }
    //   );
    // }

    const body = await request.json();
    const { mode, budgetList, incomeList, expenseList, prompt } = body;

    console.log("[Alfred Route] Mode:", mode);
    console.log("[Alfred Route] Data received - budgets:", budgetList?.length, "incomes:", incomeList?.length, "expenses:", expenseList?.length);

    if (!mode || !["chat", "advice"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'chat' or 'advice'." },
        { status: 400 }
      );
    }

    // Data transformation (shared between both modes)
    let budgetArray = Array.isArray(budgetList) ? budgetList : [];
    let incomeArray = Array.isArray(incomeList) ? incomeList : [];
    let expenseArray = Array.isArray(expenseList) ? expenseList : [];

    const totalBudget = budgetArray?.map((budget) => ({
      item: budget.name,
      amount: parseInt(budget.amount, 10),
      id: budget.id,
    }));

    const totalIncome = incomeArray?.map((income) => ({
      item: income.name,
      amount: parseInt(income.amount, 10),
    }));

    const totalSpend = expenseArray?.map((expense) => ({
      item: expense.name,
      budgetId: expense.budgetId,
      amount: parseInt(expense.expense, 10),
    }));

    let userPrompt;

    if (mode === "chat") {
      // Chat mode prompt (Alfred with full context)
      userPrompt = `
  You are Alfred, a knowledgeable and professional financial advisor. Your role is to help users analyze and manage their finances. You can also engage in friendly chitchat when appropriate.

  **Data Provided**:
  1. **Budget List**: ${JSON.stringify(totalBudget)}  
      - A list of the user's budgets, categorized by specific areas, each with a unique 'id'.
  2. **Income List**: ${JSON.stringify(totalIncome)}  
      - A list of the user's income sources, categorized by source and amount.
  3. **Expenses List**: ${JSON.stringify(totalSpend)}  
      - A list of the user's expenses, where the 'budgetId' corresponds to an 'id' in the Budget List.

  ### Behavior Rules:
  1. **Greetings and Introductions**:
     - If the user greets you (e.g., "hi," "hello," "hey"), respond warmly without analyzing financial data.
     - Example response: "Hello! I'm Alfred, your financial advisor. How can I assist you today?"
     - Do **not** analyze financial data or give advice unless explicitly asked.

  2. **Financial Data Analysis**:
     - If the user asks about budgeting, income, or expenses, analyze the provided data and give tailored advice.
     - Use the Budget List, Income List, and Expenses List to provide actionable insights. Avoid discussing other topics.

  3. **General Finance Questions**:
     - If the user asks general questions about finance (e.g., "What is budgeting?"), explain the concept simply and professionally.

  4. **Stay on Topic**:
     - For questions unrelated to finance or greetings, politely state that your expertise is in finance and redirect the user to relevant topics.

  5. **Avoid Redundancy**:
     - Do not repeat greetings, introductions, or financial analysis unnecessarily.

  6. **Currency**
     - All data is in Pakistani rupees.

  7. **No Code Output**:
     - Do NOT write or output any computer code (like Python, JavaScript, etc.). You must calculate and analyze the data internally and provide the final answer directly in natural language.

  8. **Prompt**:
     ${prompt}

  Respond professionally, analyzing the user's financial data or answering their questions **only when prompted**. For greetings or chitchat, keep responses simple and avoid financial analysis unless explicitly requested. If no data is provided then response appropriately.
`;
    } else {
      // Advice mode prompt (auto-generated summary)
      userPrompt = `
        You are Alfred, a financial expert. Based on the following data, provide a 2-3 line financial summary: 

        - Budget List: ${JSON.stringify(totalBudget)}
        - Income List: ${JSON.stringify(totalIncome)}
        - Expenses List: ${JSON.stringify(totalSpend)}

        The 'budgetId' in the Expenses List refers to the 'id' in the Budget List.

        Instructions:

        1.  If all of the lists are empty, respond with: "No financial data provided. Please input your income, budget, and expenses for analysis."
        2. All data is in Pakistani rupees.
        3.  Otherwise:
            a. Calculate total budget, income, and expenses.
            b. Analyze the user's financial situation based on these totals, including cash flow, budget adherence, and any potential issues or warnings like budget overflow.
            c. Provide two concise, actionable pieces of financial advice.

        Respond in two or three lines in a clear and professional tone.
    `;
    }

    try {
      console.log("[Alfred Route] Sending message to Groq...");
      const response = await groq.chat.completions.create({
        // model: "groq/compound-mini", //ayan's model
        model:"llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 1,
        max_tokens: 500 //8192,
      });

      const res = response.choices[0]?.message?.content || "";
      console.log("[Alfred Route] Groq response received, length:", res?.length);
      return NextResponse.json({ response: res }, { status: 200 });
    } catch (error) {
      const errorString = String(error?.message || JSON.stringify(error));
      console.error("[Alfred Route] Groq API Error:", errorString);
      console.error("[Alfred Route] Full error object:", error);
      
      if (
        errorString.includes("429") ||
        errorString.includes("rate_limit") ||
        errorString.toLowerCase().includes("quota") ||
        errorString.toLowerCase().includes("rate") ||
        errorString.toLowerCase().includes("throttle")
      ) {
        console.warn("[Alfred Route] Rate limit/quota error detected");
        return NextResponse.json(
          { error: "Groq API rate limit exceeded. Please try again in a few minutes." },
          { status: 429 }
        );
      }

      if (errorString.includes("401") || errorString.includes("invalid")) {
        console.warn("[Alfred Route] Authentication error");
        return NextResponse.json(
          {
            error:
              "Invalid Groq API key. Check your GROQ_API_KEY in .env.",
          },
          { status: 401 }
        );
      }

      throw error;
    }
  } catch (error) {
    const errorString = String(error?.message || JSON.stringify(error));
    console.error("[Alfred Route] Full error:", error);
    console.error("[Alfred Route] Error message:", errorString);
    
    return NextResponse.json(
      { error: "Failed to process your request. Check your API key and try again later." },
      { status: 500 }
    );
  }
}
