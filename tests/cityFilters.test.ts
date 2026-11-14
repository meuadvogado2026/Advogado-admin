import { expect, it } from "vitest";
import { filterCatalogCities } from "../src/geographyCatalog";
import type { CityRecord } from "../src/adminApi";
const base={normalizedName:"",center:{lat:0,lng:0},createdAt:"2026-11-14",updatedAt:"2026-11-14"};
const cities:CityRecord[]=[{...base,id:"sp",stateId:"SP",name:"São Paulo",active:true},{...base,id:"rj",stateId:"RJ",name:"São Pedro",active:true},{...base,id:"inactive",stateId:"SP",name:"Campinas",active:false}];
it("restricts cities to their state and normalizes accented names",()=>{expect(filterCatalogCities(cities,"SP"," sao ","active").map(c=>c.id)).toEqual(["sp"]);});
it("can consult inactive records without mixing them into the default active list",()=>{expect(filterCatalogCities(cities,"SP","","inactive").map(c=>c.id)).toEqual(["inactive"]);expect(filterCatalogCities(cities,"","","active")).toHaveLength(2);expect(filterCatalogCities(cities,"","","all")).toHaveLength(3);});
it("returns an empty list for a state without cities",()=>{expect(filterCatalogCities(cities,"GO","","all")).toEqual([]);});
