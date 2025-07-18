import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class DataLoaderService {

    constructor(private http: HttpClient) { }

    public loadGameData(): Observable<any> {
        const characterNames = [
            'gabriel', 
            'bento', 
            'maria', 
            'joao', 
            'paulo', 
            'tome', 
            'pedro', 
            'tiago', 
            'mateus', 
            'lucas', 
            'andre', 
            'filipe', 
            'judas', 
            'nero', 
            'caifas'
        ];

        // Cria um array de Observables, um para cada arquivo JSON
        const requests: Observable<any>[] = [
            this.http.get('/assets/data/config.json'),
            this.http.get('/assets/data/fases.json'),
            this.http.get('/assets/data/itens.json'),
            ...characterNames.map(name => this.http.get(`/assets/data/personagens/${name}.json`))
        ];

        // forkJoin espera que todas as requisições HTTP terminem
        return forkJoin(requests).pipe(
            map(responses => {
                const [config, fases, itens, ...personagens] = responses;

                // Monta o objeto de personagens
                const personagens_base: { [key: string]: any } = {};
                personagens.forEach((charData, index) => {
                    personagens_base[characterNames[index]] = charData;
                });

                // Monta e retorna o objeto gameData final
                return {
                    config,
                    ...fases,
                    itens,
                    personagens_base
                };
            })
        );
    }
}