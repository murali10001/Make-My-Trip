import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import store, { setUser } from "@/store";
import { Provider } from "react-redux";
import Navbar from "@/components/Navbar";

import { useEffect } from "react";
import Footer from "@/components/Fotter";

const Myapp = ({ Component, pageProps }: AppProps) => {
  useEffect(() => {
    const storeduser = localStorage.getItem("user");
    if (storeduser && storeduser !== "undefined" && storeduser !== "null") {
      try {
        const parsed = JSON.parse(storeduser);
        if (parsed) {
          store.dispatch(setUser(parsed));
        }
      } catch (err) {
        console.error("Failed to parse stored user from localStorage:", err);
      }
    }
  }, []);
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <Navbar />
      <Component {...pageProps} />
      <Footer/>
    </div>
  );
};
export default function App(props: AppProps) {
  return (
    <Provider store={store}>
      <Head>
        <title>MakeMyTour</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <Myapp {...props} />
    </Provider>
  );
}
