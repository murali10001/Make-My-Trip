import React from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import Loader from "@/components/Loader";

const DynamicPricingEngine = dynamic(
  () => import("@/components/Pricing/DynamicPricingEngine"),
  {
    ssr: false,
    loading: () => (
      <div className="py-12 flex justify-center">
        <Loader />
      </div>
    ),
  }
);

const DynamicPricingPage = () => {
  return (
    <>
      <Head>
        <title>Dynamic Pricing Engine & Bank Card Offers | MakeMyTour</title>
        <meta
          name="description"
          content="Real-time dynamic pricing engine, price history graphs, 24h price lock protection, and e-cart bank card offers on MakeMyTour."
        />
      </Head>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <DynamicPricingEngine />
      </main>
    </>
  );
};

export default DynamicPricingPage;
