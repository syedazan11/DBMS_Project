"use client";
import SideNav from "./_components/SideNav";
import DashboardHeader from "./_components/DashboardHeader";
import { useUser } from "@/context/auth-context";
import Loader from "./Loader";
import { useGlobalContext } from "@/context/context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const DashboardLayout = ({ children }) => {
  const { expand, setExpand, mobileScreen } = useGlobalContext();
  const router = useRouter();

  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
    return <Loader />;
  }

  return (
    <>
      {user ? (
        <div className="h-full w-full flex">
          <section className="">
            <SideNav
              expand={expand}
              setExpand={setExpand}
              mobileScreen={mobileScreen}
            />
          </section>
          <section className="w-full h-[100dvh] flex flex-col">
            <DashboardHeader
              expand={expand}
              setExpand={setExpand}
              mobileScreen={mobileScreen}
            />
            {children}
          </section>
        </div>
      ) : (
        <Loader />
      )}
    </>
  );
};

export default DashboardLayout;
