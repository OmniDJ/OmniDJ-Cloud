import React, { forwardRef, useState, useImperativeHandle } from "react";

import Loader from "react-loader-spinner";

import { echoFor, echo } from "components/echo/echo";

export const LoaderView = forwardRef(
  ({ children, className, onClick, ...rest }, ref) => {
    let echo = echoFor("LoaderView");

    const [isLoading, setIsLoading] = useState();

    useImperativeHandle(ref, () => ({
      set isLoading(value) {
        echo("isLoading setter called with: ", value);
        setIsLoading(value);
      }
    }));

    return (
      <>
        {children}
        {isLoading && (
          <div className="absolute top-0 left-0 bottom-0 right-0">
            <div
              className="w-full h-full bg-white opacity-50 flex justify-center items-center"
              onClick={onClick}
            >
              <div className="w-8 h-8 inline-block">
                <Loader
                  type="Puff"
                  color="#00BFFF"
                  height={30}
                  width={30}
                  timeout={0}
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);
