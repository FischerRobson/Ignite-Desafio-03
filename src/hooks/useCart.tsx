import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const productInCart = newCart.find(e => e.id === productId);
      const stock = await api.get(`stock/${productId}`)
        .then(res => res.data.amount);

      const currentAmount = productInCart ? productInCart.amount : 0;

      if (currentAmount + 1 > stock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      else if (productInCart) {
        productInCart.amount += 1;
      }
      else {
        const newProductRaw = await api.get(`/products/${productId}`)
          .then(res => res.data);

        const newProduct = {
          ...newProductRaw,
          amount: 1
        };

        newCart.push(newProduct);
      }
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(e => e.id !== productId);
      if (newCart.length !== cart.length) {
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else return;
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;
      const newCart = [...cart];
      const stock = await api.get(`stock/${productId}`)
        .then(res => res.data.amount);

      if (amount > stock) return toast.error('Quantidade solicitada fora de estoque');
      else {
        const productToUpdate = newCart.find(e => e.id === productId);
        if (productToUpdate) productToUpdate.amount = amount;
      }
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
