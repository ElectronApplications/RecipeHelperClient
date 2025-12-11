import { useEffect, useMemo, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

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
  const ingredientsMap = useMemo(() => {
    const dict: { [id: string]: IngredientDescription } = {};
    for (const ingredient of ingredients) {
      dict[ingredient.id] = ingredient;
    }
    return dict;
  }, [ingredients]);

  useEffect(() => {
    (async () => {
      const data: IngredientDescription[] = await (
        await fetch("/api/ingredients")
      ).json();
      setIngredients(data);
    })();
  }, []);

  const [socket, setSocket] = useState<WebSocket>();
  const [connectionStep, setConnectionStep] = useState<ConnectionStep>();

  useEffect(() => {
    const socket = new WebSocket("/ws-api/recipes");

    socket.onopen = () => {
      setSocket(socket);
    };

    socket.onmessage = (event) => {
      setConnectionStep(JSON.parse(event.data));
    };

    return () => {
      socket.close();
    };
  }, []);

  const sendIngredientInfo = (info: IngredientInfo) => {
    socket?.send(JSON.stringify(info));
  };

  return (
    <>
      {connectionStep !== undefined && (
        <div>
          {connectionStep.unknownIngredients.length > 0 &&
            connectionStep.unknownIngredients[0].weight !== 0 && (
              <div>
                <h1>
                  Do you have
                  {
                    ingredientsMap[
                      connectionStep.unknownIngredients[0].ingredient
                    ]?.name
                  }
                  ?
                </h1>
                <button
                  onClick={() =>
                    sendIngredientInfo({
                      ingredient:
                        connectionStep.unknownIngredients[0].ingredient,
                      has: true,
                    })
                  }
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
                >
                  No
                </button>
              </div>
            )}
          <h2>Recipes:</h2>
          {connectionStep.recipes.map((recipe) => (
            <div>
              {recipe.recipe.name}
              {recipe.possible === true
                ? "Possible"
                : recipe.possible === false
                ? "Not possible"
                : "Potentially possible"}
            </div>
          ))}
          {connectionStep.recipes.every(
            (recipe) => recipe.possible === false
          ) && "СХОДИ В МАГАЗИН ЧЕЛ"}
        </div>
      )}
    </>
  );
}

export default App;
