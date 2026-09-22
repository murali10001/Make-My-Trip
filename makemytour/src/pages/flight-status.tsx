import React from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import Loader from "@/components/Loader";

const LiveFlightTracker = dynamic(
  () => import("@/components/Flights/LiveFlightTracker"),
  {
    ssr: false,
    loading: () => (
      <div className="py-12 flex justify-center">
        <Loader />
      </div>
    ),
  }
);

const FlightStatusPage = () => {
  return (
    <>
      <Head>
        <title>Live Flight Status & Radar Tracker | MakeMyTour</title>
        <meta
          name="description"
          content="Track real-time flight updates, delay notifications, gate changes, and multi-flight dynamic ETAs on MakeMyTour."
        />
      </Head>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <LiveFlightTracker />
      </main>
    </>
  );
};

export default FlightStatusPage;
