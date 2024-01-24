import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.sass']
})
export class NotificationComponent implements OnInit {
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() imageUrl: string = '';

  constructor() { }

  ngOnInit(): void {
  }

}
