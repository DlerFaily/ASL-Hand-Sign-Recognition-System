import apiClient from "../cfg/api";
import { useEffect, useState } from "react";

export function Test() {
    const [resp, setResp] = useState<string>();

    useEffect(() => {
        apiClient.get("/api/test/")
        .then((res) => {
            setResp(res.data.message as string);
            console.log(res.data)
        });
    }, [])


      return <div>message: {resp && resp}  <div id="root">
      <h1 className="text-3xl font-bold underline">
    Hello world!
  </h1> </div></div>;
}