import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ellipse-pgComponent} from "./ellipse-pg.component";
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";
import {Observable, of} from "rxjs";

describe('EllipsePgComponent', () => {
  let fixture: ComponentFixture<EllipsePgComponent>;
  let component: EllipsePgComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EllipsePgComponent],
      imports: [TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader, useValue: {
            getTranslation(): Observable<Record<string, string>> {
              return of({});
            }
          }
        }
      })],
    }).compileComponents();

    fixture = TestBed.createComponent(EllipsePgComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
