import {Component, OnInit, Input, Output, ElementRef, Inject, OnDestroy, OnChanges, EventEmitter} from '@angular/core';
import {RouterLink, Router} from '@angular/router-deprecated';
import {Observable} from 'rxjs/Observable';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {Subject} from 'rxjs/Subject';

const _ = require('lodash');

let tpl = require('./street.template.html');
let style = require('./street.css');

@Component({
  selector: 'street',
  template: tpl,
  styles: [style],
  directives: [RouterLink]
})

export class StreetComponent implements OnInit, OnDestroy, OnChanges {
  @Input('thing')
  protected thing:string;
  @Input('query')
  private query:string;
  @Input('places')
  private places:Observable<any>;
  @Input('chosenPlaces')
  private chosenPlaces:Observable<any>;
  @Input('hoverPlace')
  private hoverPlace:Subject<any>;
  @Input('controllSlider')
  private controllSlider:Subject<any>;
  @Output('filterStreet')
  private filterStreet:EventEmitter<any> = new EventEmitter();

  private street:any;
  private element:HTMLElement;
  private router:Router;

  private resize:any;
  private drawOnMap:boolean = false;

  private placesSubscribe:any;
  private hoverPlaceSubscribe:any;
  private chosenPlacesSubscribe:any;
  private mouseMoveSubscriber:any;
  private math:any;
  private svg:SVGElement;
  private showSlider:boolean;

  public constructor(@Inject(ElementRef) element:ElementRef,
                     @Inject(Router) router:Router,
                     @Inject('Math') math:any,
                     @Inject('StreetDrawService') streetDrawService:any) {
    this.element = element.nativeElement;
    this.router = router;
    this.math = math;
    this.street = streetDrawService;
    this.showSlider = this.router.hostComponent.name === 'MatrixComponent';
  }

  public ngOnInit():any {
    let parseUrl:any;

    if (this.query) {
      parseUrl = this.parseUrl(this.query);
    } else {
      parseUrl = {
        lowIncome: 0,
        highIncome: 15000
      };
    }

    this.street.setSvg = this.svg = this.element.querySelector('.street-box svg') as SVGElement;

    this.street.set('lowIncome', parseUrl.lowIncome);
    this.street.set('highIncome', parseUrl.highIncome);

    this.chosenPlacesSubscribe = this.chosenPlaces && this.chosenPlaces.subscribe((chosenPlaces:any):void => {
        if (!chosenPlaces.length) {
          this.street.clearAndRedraw(chosenPlaces);
          return;
        }

        this.street.set('chosenPlaces', chosenPlaces);

        if (this.controllSlider) {
          this.street.clearAndRedraw(chosenPlaces, true);

          return;
        }

        this.street.clearAndRedraw(chosenPlaces);
      });

    this.hoverPlaceSubscribe = this.hoverPlace && this.hoverPlace.subscribe((hoverPlace:any):void => {
        if (this.drawOnMap) {
          this.drawOnMap = !this.drawOnMap;

          return;
        }

        if (!hoverPlace) {
          this.street.removeHouses('hover');
          this.street.clearAndRedraw(this.street.chosenPlaces);

          return;
        }

        this.street.set('hoverPlace', hoverPlace);
        this.street.drawHoverHouse(hoverPlace);
      });

    this.placesSubscribe = this.places && this.places.subscribe((places:any):void => {
        this.street
          .clearSvg()
          .init(this.street.lowIncome, this.street.highIncome)
          .drawScale(places, this.showSlider)
          .set('places', _.sortBy(places, 'income'))
          .set('fullIncomeArr', _
            .chain(this.street.places)
            .sortBy('income')
            .map((place:any) => {
              if (!place) {
                return void 0;
              }

              return this.street.scale(place.income);
            })
            .compact()
            .value());

        if (this.street.chosenPlaces && this.street.chosenPlaces.length) {
          this.street.clearAndRedraw(this.street.chosenPlaces);
        }
      });

    this.street.filter.subscribe((filter:any):void => {
      let query:any;

      if (this.query) {
        query = this.parseUrl(this.query);
      } else {
        query = {};
      }

      query.lowIncome = filter.lowIncome;
      query.highIncome = filter.highIncome;

      if (filter.lowIncome === this.street.lowIncome && filter.highIncome === this.street.highIncome) {
        return;
      }

      this.filterStreet.emit({url: this.objToQuery(query)});
    });

    this.street.filter.next({lowIncome: this.street.lowIncome, highIncome: this.street.highIncome});

    this.resize = fromEvent(window, 'resize')
      .debounceTime(150)
      .subscribe(() => {
        this.street
          .clearSvg()
          .init(this.street.lowIncome, this.street.highIncome)
          .drawScale(this.street.places, this.showSlider)
          .set('places', _.sortBy(this.street.places, 'income'))
          .set('fullIncomeArr', _
            .chain(this.street.places)
            .sortBy('income')
            .map((place:any) => {
              if (!place || !place.length) {
                return;
              }

              return this.street.scale(place.income);
            }).value()
          )
          .set('chosenPlaces', this.street.chosenPlaces);

        if (this.controllSlider) {
          this.street.clearAndRedraw(this.street.chosenPlaces, true);

          return;
        }

        this.street.clearAndRedraw(this.street.chosenPlaces);
      });
  }

  public ngOnChanges(changes:any):void {
    if (changes.query && changes.query.currentValue) {
      let parseUrl = this.parseUrl(this.query);

      this.street.set('lowIncome', parseUrl.lowIncome);
      this.street.set('highIncome', parseUrl.highIncome);
    }
  }

  public ngOnDestroy():void {
    if (this.resize) {
      this.resize.unsubscribe();
    }

    if (this.placesSubscribe) {
      this.placesSubscribe.unsubscribe();
    }

    if (this.hoverPlaceSubscribe) {
      this.hoverPlaceSubscribe.unsubscribe();
    }

    if (this.chosenPlacesSubscribe) {
      this.chosenPlacesSubscribe.unsubscribe();
    }

    if (this.mouseMoveSubscriber) {
      this.mouseMoveSubscriber.unsubscribe();
    }
  }

  private objToQuery(data:any):string {
    return Object.keys(data).map((k:string) => {
      return encodeURIComponent(k) + '=' + data[k];
    }).join('&');
  }

  private parseUrl(url:string):any {
    let urlForParse = ('{\"' + url.replace(/&/g, '\",\"') + '\"}').replace(/=/g, '\":\"');
    let query = JSON.parse(urlForParse);

    query.regions = query.regions.split(',');
    query.countries = query.countries.split(',');

    return query;
  }
}
