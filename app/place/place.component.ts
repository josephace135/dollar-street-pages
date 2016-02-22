import { Component } from 'angular2/core';
import {FooterComponent} from '../common/footer/footer.component';
import {StreetComponent} from '../common/street/street.component';
import {HeaderComponent} from '../common/header/header.component';
import {SliderPlaceComponent} from './slider/slider.place.component';


import {FamilyPlaceComponent} from './family/family.place.component';

let tpl = require('./place.component.html');
let style = require('./place.component.css');


@Component({
  selector: 'place',
  template: tpl,
  styles: [style],
  directives: [HeaderComponent, StreetComponent, SliderPlaceComponent, FamilyPlaceComponent, FooterComponent]
})

export class PlaceComponent {
  query:string = `thing=546ccf730f7ddf45c0179688&image=556470c7ea89dc0e1a5003f5`;

  urlChanged(url) {
    console.log(url);
  }
}
