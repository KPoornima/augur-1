import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import classNames from 'classnames'
import PropTypes from 'prop-types'

import makePath from 'modules/routes/helpers/make-path'

import Styles from 'modules/app/components/side-nav/side-nav.styles'

export default class SideNav extends Component {
  static propTypes = {
    isMobile: PropTypes.bool.isRequired,
    isLogged: PropTypes.bool,
    menuData: PropTypes.array.isRequired,
    mobileShow: PropTypes.bool.isRequired
  };

  constructor() {
    super()
    this.state = {
      selectedItem: null,
      selectedKey: null
    }
  }

  componentWillReceiveProps(newProps) {
    if (this.props.isMobile !== newProps.isMobile) {
      this.setState({ selectedItem: null, selectedKey: null })
    }
  }

  isCurrentItem(item) {
    const selected = (this.state.selectedKey &&
                      this.state.selectedKey === item.title)
    return selected
  }

  itemClick(item) {
    const mobile = this.props.isMobile
    if (!mobile && this.isCurrentItem(item)) return
    const clickCallback = item.onClick
    if (clickCallback && typeof clickCallback === 'function') {
      clickCallback()
    }
    if (this.state.selectedItem &&
        this.state.selectedItem.onBlur &&
        typeof this.state.selectedItem.onBlur === 'function') {
      this.state.selectedItem.onBlur()
    }

    // don't modify selected item if mobile
    // mobile menu state works differently
    if (mobile) return

    // set title as key for equality check
    // because the state item de-syncs with
    // this.props.menuData's instance
    this.setState({ selectedItem: item, selectedKey: item.title })
  }

  renderSidebarMenu() {
    const mobile = this.props.isMobile
    const logged = this.props.isLogged

    const accessFilteredMenu = this.props.menuData.filter(item => !(item.requireLogin && !logged))

    return (
      <ul className={Styles.SideNav__nav}>
        {accessFilteredMenu.map((item, index) => {
          const Icon = item.icon
          const selected = !mobile && this.isCurrentItem(item)

          return (
            <li
              className={classNames({ [`${Styles.selected}`]: selected })}
              key={item.title}
            >
              <Link
                to={makePath(item.route)}
              >
                <Icon />
                <span className="item-title">{item.title}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  render() {
    return (
      <aside className={classNames(Styles.SideNav, { [`${Styles.mobileShow}`]: this.props.mobileShow })}>
        {this.renderSidebarMenu()}
      </aside>
    )
  }
}

// NOTE -- historical ref

// import React, { Component } from 'react';
// import PropTypes from 'prop-types';
// import isEqual from 'lodash/isEqual';
//
// import Checkbox from 'modules/common/components/checkbox';
// import NullStateMessage from 'modules/common/components/null-state-message';
//
// import parseQuery from 'modules/app/helpers/parse-query';
// import parseStringToArray from 'modules/app/helpers/parse-string-to-array';
// import makeQuery from 'modules/app/helpers/make-query';
//
// import orderBy from 'lodash/orderBy';
//
// import { TAGS_PARAM_NAME } from 'modules/app/constants/param-names';
//
// // import Checkbox from 'modules/common/components/checkbox';
// // import NullStateMessage from 'modules/common/components/null-state-message';
//
// // This is a funky special case for how filtering works, normally this would directly employ the filter-sort components
//
// // NOTE --
// // Take in filteredMarkets + markets
//
// // From that data, re-calc the tags + counts
// // Toggling tags will directly update the query params, which will trigger an update to the filters
//
// export default class SideBar extends Component {
//   static propTypes = {
//     markets: PropTypes.array.isRequired,
//     marketsFilteredSorted: PropTypes.array.isRequired,
//     headerHeight: PropTypes.number.isRequired,
//     footerHeight: PropTypes.number.isRequired,
//     location: PropTypes.object.isRequired,
//     history: PropTypes.object.isRequired
//   };
//
//   constructor(props) {
//     super(props);
//
//     this.state = {
//       filteredMarkets: [],
//       filteredTags: []
//     };
//
//     this.updateFilteredMarketTags = this.updateFilteredMarketTags.bind(this);
//     this.toggleTag = this.toggleTag.bind(this);
//   }
//
//   componentWillMount() {
//     this.updateFilteredMarketTags(this.props.markets, this.props.marketsFilteredSorted, this.props.location);
//   }
//
//   componentWillReceiveProps(nextProps) {
//     if (
//       !isEqual(this.props.markets, nextProps.markets) ||
//       !isEqual(this.props.marketsFilteredSorted, nextProps.marketsFilteredSorted) ||
//       !isEqual(this.props.location.search, nextProps.location.search)
//     ) {
//       this.updateFilteredMarketTags(nextProps.markets, nextProps.marketsFilteredSorted, nextProps.location);
//     }
//   }
//
//   toggleTag(tag) {
//     let searchParams = parseQuery(this.props.location.search);
//
//     if (searchParams[TAGS_PARAM_NAME] == null || !searchParams[TAGS_PARAM_NAME].length) {
//       searchParams[TAGS_PARAM_NAME] = [encodeURIComponent(tag)];
//       searchParams = makeQuery(searchParams);
//
//       return this.props.history.push({
//         ...this.props.location,
//         search: searchParams
//       });
//     }
//
//     const tags = parseStringToArray(decodeURIComponent(searchParams[TAGS_PARAM_NAME]), '+');
//
//     if (tags.indexOf(tag) !== -1) { // Remove Tag
//       tags.splice(tags.indexOf(tag), 1);
//     } else { // add tag
//       tags.push(tag);
//     }
//
//     if (tags.length) {
//       searchParams[TAGS_PARAM_NAME] = tags.join('+');
//     } else {
//       delete searchParams[TAGS_PARAM_NAME];
//     }
//
//     searchParams = makeQuery(searchParams);
//
//     this.props.history.push({
//       ...this.props.location,
//       search: searchParams
//     });
//   }
//
//   updateFilteredMarketTags(markets, marketsFilteredSorted, location) {
//     const tagCounts = {};
//
//     // count matches for each filter and tag
//     markets.forEach((market, i) => {
//       if (marketsFilteredSorted.indexOf(i) !== -1) {
//         market.tags.forEach((tag) => {
//           tagCounts[tag] = tagCounts[tag] || 0;
//           tagCounts[tag] += 1;
//         });
//       }
//     });
//
//     // make sure all selected tags are displayed, even if markets haven't loaded yet
//     const selectedTags = parseStringToArray(decodeURIComponent(parseQuery(location.search)[TAGS_PARAM_NAME] || ''), '+');
//
//     selectedTags.forEach((selectedTag) => {
//       if (!tagCounts[selectedTag]) {
//         tagCounts[selectedTag] = 0;
//       }
//     });
//
//     let filteredTags = Object.keys(tagCounts).filter(tag => tagCounts[tag] > 0 || selectedTags.indexOf(tag) !== -1);
//
//     filteredTags = orderBy(filteredTags, [tag => selectedTags.indexOf(tag) !== -1, tag => tagCounts[tag], tag => tag.toLowerCase()], ['desc', 'desc', 'asc']) // Sorts by selected -> count -> alphabetical
//       .slice(0, 50)
//       .map((tag) => {
//         const obj = {
//           name: tag,
//           numMatched: tagCounts[tag],
//           isSelected: (selectedTags || []).indexOf(tag) !== -1
//         };
//         return obj;
//       });
//
//     this.setState({ filteredTags });
//   }
//
//   render() {
//     const p = this.props;
//     const s = this.state;
//
//     return (
//       <aside
//         className="side-bar"
//         style={{
//           top: p.headerHeight,
//           bottom: p.footerHeight
//         }}
//       >
//         <h3>All Tags</h3>
//         <div className="tags">
//           {s.filteredTags.length ?
//             s.filteredTags.map(tag =>
//               <Checkbox
//                 key={tag.name}
//                 className="tag"
//                 text={tag.name}
//                 text2={`(${tag.numMatched})`}
//                 isChecked={tag.isSelected}
//                 onClick={() => this.toggleTag(tag.name)}
//               />
//             ) :
//             <NullStateMessage message="No Tags Available" />
//           }
//         </div>
//       </aside>
//     );
//   }
// }
