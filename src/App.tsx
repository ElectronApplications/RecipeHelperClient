import { useEffect, useMemo, useState } from "react";

type IngredientAmountType = "Millilitres" | "Grams" | "Pieces";

type IngredientDescription = {
  id: string;
  name: string;
  amountType: IngredientAmountType;
};

type Ingredient = {
  ingredient: string;
  amount: number;
};

type Recipe = {
  name: string;
  recipeSteps: string[];
  ingredients: Ingredient[];
};

type UnknownIngredient = {
  ingredient: string;
  weight: number;
};

type IngredientInfo = {
  ingredient: string;
  has: boolean;
};

type UserRecipe = {
  recipe: Recipe;
  possible: boolean | null;
};

type ConnectionStep = {
  unknownIngredients: UnknownIngredient[];
  recipes: UserRecipe[];
};

function App() {
  const [ingredients, setIngredients] = useState<IngredientDescription[]>([]);
  const [socket, setSocket] = useState<WebSocket>();
  const [connectionStep, setConnectionStep] = useState<ConnectionStep>();

  const sortedRecipes = useMemo(() => {
    if (!connectionStep?.recipes) return [];

    // 2. Clone the array and sort it
    return [...connectionStep.recipes].sort((a, b) => {
      // Map status to a priority (1 is highest/top)
      const priority = (p: boolean | null) => {
        if (p === true) return 1;
        if (p === null) return 2;
        return 3; // false
      };

      return priority(a.possible) - priority(b.possible);
    });
  }, [connectionStep?.recipes]);

  // NEW: State to track the currently viewed recipe
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const ingredientsMap = useMemo(() => {
    const dict: Record<string, IngredientDescription> = {};
    for (const ingredient of ingredients) {
      dict[ingredient.id] = ingredient;
    }
    return dict;
  }, [ingredients]);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/ingredients");
        const data = await response.json();
        setIngredients(data);
      } catch (e) {
        console.error("Failed to fetch ingredients", e);
      }
    })();
  }, []);

  useEffect(() => {
    const ws = new WebSocket("/ws-api/recipes");
    ws.onopen = () => setSocket(ws);
    ws.onmessage = (event) => setConnectionStep(JSON.parse(event.data));
    return () => ws.close();
  }, []);

  const sendIngredientInfo = (info: IngredientInfo) => {
    socket?.send(JSON.stringify(info));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {connectionStep !== undefined && (
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
          {/* Unknown Ingredient Prompt */}
          {connectionStep.unknownIngredients.length > 0 &&
            connectionStep.unknownIngredients[0].weight !== 0 && (
              <div className="mb-6 p-4 bg-blue-50 rounded-md shadow-sm border border-blue-100">
                <h1 className="text-xl font-semibold mb-4 text-gray-800">
                  Do you have{" "}
                  <span className="text-blue-600 font-bold">
                    {ingredientsMap[
                      connectionStep.unknownIngredients[0].ingredient
                    ]?.name || "this ingredient"}
                  </span>
                  ?
                </h1>
                <div className="flex gap-4">
                  <button
                    onClick={() =>
                      sendIngredientInfo({
                        ingredient:
                          connectionStep.unknownIngredients[0].ingredient,
                        has: true,
                      })
                    }
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() =>
                      sendIngredientInfo({
                        ingredient:
                          connectionStep.unknownIngredients[0].ingredient,
                        has: false,
                      })
                    }
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    No
                  </button>
                </div>
              </div>
            )}

          <h2 className="text-2xl font-bold mb-4 text-gray-800">Recipes</h2>
          <div className="space-y-3">
            {sortedRecipes.map((userRecipe) => (
              <div
                key={userRecipe.recipe.name}
                // Updated: Added cursor-pointer and onClick to open the recipe
                onClick={() => setSelectedRecipe(userRecipe.recipe)}
                className={`p-3 rounded-lg shadow-sm flex justify-between items-center cursor-pointer transform transition hover:scale-[1.02] active:scale-95 ${
                  userRecipe.possible === true
                    ? "bg-green-100 text-green-800 border-l-4 border-green-500"
                    : userRecipe.possible === false
                    ? "bg-red-100 text-red-800 border-l-4 border-red-500"
                    : "bg-gray-100 text-gray-700 border-l-4 border-gray-400"
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold">{userRecipe.recipe.name}</span>
                  <span className="text-xs opacity-70">
                    Click to view details
                  </span>
                </div>
                <span className="text-xs font-bold uppercase tracking-tight">
                  {userRecipe.possible === true
                    ? "Possible"
                    : userRecipe.possible === false
                    ? "Not possible"
                    : "Unsure"}
                </span>
              </div>
            ))}
          </div>

          {connectionStep.recipes.every((r) => r.possible === false) && (
            <p className="mt-6 text-center text-red-600 font-bold p-4 bg-red-50 rounded-lg animate-pulse">
              СХОДИ В МАГАЗИН ЧЕЛ
            </p>
          )}
        </div>
      )}

      {/* RECIPE DETAILS MODAL */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-black text-gray-900">
                  {selectedRecipe.name}
                </h3>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="mb-6">
                <h4 className="font-bold text-gray-700 mb-2 border-b">
                  Ingredients
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {selectedRecipe.ingredients.map((ing, idx) => (
                    <li key={idx}>
                      <span className="font-medium text-gray-800">
                        {ingredientsMap[ing.ingredient]?.name || ing.ingredient}
                      </span>
                      : {ing.amount}{" "}
                      {ingredientsMap[ing.ingredient]?.amountType || ""}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-gray-700 mb-2 border-b">
                  Instructions
                </h4>
                <ol className="list-decimal list-inside space-y-3 text-gray-600">
                  {selectedRecipe.recipeSteps.map((step, idx) => (
                    <li key={idx} className="pl-2">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setSelectedRecipe(null)}
                className="bg-gray-800 text-white px-6 py-2 rounded-full font-bold hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
