import { afterEach, expect, it, vi } from "vitest";
import { fetchAdminCities } from "../src/adminApi";
afterEach(() => vi.unstubAllGlobals());
it("loads all admin city pages including inactive records and preserves the state filter", async () => {
 const urls: URL[]=[];
 vi.stubGlobal("fetch",vi.fn(async (url:string) => {
  const u=new URL(url);urls.push(u);const page=Number(u.searchParams.get("page"));
  return new Response(JSON.stringify({cities:[{id:`city-${page}`,active:page===1}],pagination:{page,pageSize:50,total:51,totalPages:2}}),{status:200});
 }));
 const cities=await fetchAdminCities("fixture-token","state/1");
 expect(cities).toEqual([{id:"city-1",active:true},{id:"city-2",active:false}]);
 expect(urls).toHaveLength(2);
 for(const url of urls){expect(url.searchParams.get("includeInactive")).toBe("true");expect(url.searchParams.get("stateId")).toBe("state/1");}
});
it("does not return a partial city catalog when a later page fails", async () => {
 vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({cities:[{id:"city-1"}],pagination:{page:1,totalPages:2}}),{status:200})).mockResolvedValueOnce(new Response(JSON.stringify({error:{message:"Unavailable"}}),{status:503})));
 await expect(fetchAdminCities("fixture-token")).rejects.toThrow("Unavailable");
});
