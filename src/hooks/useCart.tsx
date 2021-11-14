import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function findProductById(productId: number) {
    return cart.find((product) => product.id === productId);
  }

  function updateCart(cart: Product[]) {
    setCart(cart);
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }

  async function findStockByProductId(productId: number) {
    return (await api.get<UpdateProductAmount>(`stock/${productId}`)).data;
  }

  const addProduct = async (productId: number) => {
    try {
      const currentCart = [...cart];

      let productExists = findProductById(productId);

      const stock = await findStockByProductId(productId);

      const currentAmount = productExists ? productExists.amount : 0;
      const stockAmount = stock.amount;
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExists) {
        productExists.amount = amount;
      } else {
        const response = await api.get<Product>(`products/${productId}`);

        currentCart.push({ ...response.data, amount: 1 });
      }

      updateCart(currentCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const currentCart = [...cart];

      let productExists = findProductById(productId);

      if (!productExists) {
        throw new Error("Erro na remoção do produto");
      }

      const products = currentCart.filter(
        (product) => product.id !== productId
      );

      updateCart(products);
    } catch (error) {
      const { message } = error as Error;
      toast.error(message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const currentCart = [...cart];

      const stock = await findStockByProductId(productId);

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productExists = findProductById(productId);

      if (productExists) {
        productExists.amount = amount;
      }

      updateCart(currentCart);
    } catch (error) {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
